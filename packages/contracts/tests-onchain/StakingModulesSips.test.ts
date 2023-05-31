// const { expect } = require("chai");
const chai = require("chai");
const { expect } = chai;

import {
    loadFixture,
    impersonateAccount,
    stopImpersonatingAccount,
    mine,
    mineUpTo,
    time,
    setBalance,
    setCode,
    reset,
    takeSnapshot,
    SnapshotRestorer,
} from "@nomicfoundation/hardhat-network-helpers";
import { JsonRpcSigner } from "@ethersproject/providers";
import hre from "hardhat";
import matchers from "@nomicfoundation/hardhat-chai-matchers";

const {
    ethers,
    deployments,
    deployments: { createFixture, get },
} = hre;

import sipArgs, { ISipArgument } from "../tasks/sips/args/sipArgs";

import { GovernorAlpha, LiquityBaseParams } from "types/generated";
import { ERC20 } from "types/generated/external/artifacts";
// import { SOV } from "hardhat-deploy/types";
//import zeroMyntIntegrationSIP from "../../tasks/sips/args/sipArgs";
//import zeroMyntIntegrationSIP from "../../tasks/sips/args/sipArgs";
//import zeroFeesUpdate from "../../tasks/sips/args/sipArgs";

// const GovernorAlpha = artifacts.require("GovernorAlphaMockup");

const TWO_DAYS = 86400 * 2;
// const MAX_DURATION = new BN(24 * 60 * 60).mul(new BN(1092));
const MAX_DURATION = ethers.BigNumber.from(24 * 60 * 60).mul(1092);

const ONE_RBTC = ethers.utils.parseEther("1.0");

describe("Staking Modules Deployments and Upgrades via Governance", () => {
    // async function setupTest() {
    const getImpersonatedSignerFromJsonRpcProvider = async (addressToImpersonate) => {
        //await impersonateAccount(addressToImpersonate);
        //await ethers.provider.send("hardhat_impersonateAccount", [addressToImpersonate]);
        //return await ethers.getSigner(addressToImpersonate);
        const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
        await provider.send("hardhat_impersonateAccount", [addressToImpersonate]);
        //return await ethers.getSigner(addressToImpersonate);
        return provider.getSigner(addressToImpersonate);
    };

    const setupTest = createFixture(async ({ deployments, getNamedAccounts }) => {
        const { deployer } = await getNamedAccounts();

        const deployerSigner = await ethers.getSigner(deployer);
        await setBalance(deployer, ONE_RBTC.mul(10));
        /*await deployments.fixture(["StakingModules", "StakingModulesProxy"], {
            keepExistingDeployments: true,
        }); // start from a fresh deployments
        */
        const stakingProxy = await ethers.getContract("StakingProxy", deployer);
        const stakingModulesProxy = await ethers.getContract("StakingModulesProxy", deployer);

        const god = await deployments.get("GovernorOwner");
        const governorOwner = await ethers.getContract("GovernorOwner");
        /*const governorOwner = await ethers.getContractAt(
            "GovernorAlpha",
            god.address,
            deployerSigner
        );*/
        const governorOwnerSigner: JsonRpcSigner = (await getImpersonatedSignerFromJsonRpcProvider(
            god.address
        )) as JsonRpcSigner;

        await setBalance(governorOwnerSigner._address, ONE_RBTC);
        const timelockOwner = await ethers.getContract("TimelockOwner", governorOwnerSigner);

        const timelockOwnerSigner: JsonRpcSigner = (await getImpersonatedSignerFromJsonRpcProvider(
            timelockOwner.address
        )) as JsonRpcSigner;
        await setBalance(timelockOwnerSigner._address, ONE_RBTC);

        const multisigSigner: JsonRpcSigner = (await getImpersonatedSignerFromJsonRpcProvider(
            (
                await deployments.get("MultiSigWallet")
            ).address
        )) as JsonRpcSigner;
        //
        return {
            deployer,
            deployerSigner,
            stakingProxy,
            stakingModulesProxy,
            governorOwner,
            governorOwnerSigner,
            timelockOwner,
            timelockOwnerSigner,
            multisigSigner,
        };
    });

    let loadFixtureAfterEach = false;
    let snapshot: SnapshotRestorer;
    before(async () => {
        await reset("https://mainnet-dev.sovryn.app/rpc", 5103312);
        snapshot = await takeSnapshot();
    });

    after(async () => {
        await snapshot.restore();
    });

    describe("Staking Modules Onchain Testing", () => {
        it("SIP-0054 is executable", async () => {
            if (!hre.network.tags["forked"]) return;
            await reset("https://mainnet-dev.sovryn.app/rpc", 5103312);

            const {
                deployer,
                deployerSigner,
                stakingProxy,
                stakingModulesProxy,
                governorOwner,
                governorOwnerSigner,
                timelockOwner,
                timelockOwnerSigner,
                multisigSigner,
            } = await setupTest();
            // loadFixtureAfterEach = true;

            // CREATE PROPOSAL
            const sov = await ethers.getContract("SOV", timelockOwnerSigner);
            //const whaleAmount = await sov.balanceOf(multisigSigner._address);
            //await sov.transfer(deployerSigner.address, whaleAmount);
            const whaleAmount = (await sov.totalSupply()).mul(ethers.BigNumber.from(5));

            await sov.mint(deployerSigner.address, whaleAmount);

            /*
            const quorumVotes = await governorOwner.quorumVotes();
            console.log('quorumVotes:', quorumVotes);
            */
            await sov.connect(deployerSigner).approve(stakingProxy.address, whaleAmount);
            //const stakeABI = (await hre.artifacts.readArtifact("IStaking")).abi;
            const stakeABI = (await deployments.getArtifact("IStaking")).abi;
            // const stakeABI = (await ethers.getContractFactory("IStaking")).interface;
            // alternatively for stakeABI can be used human readable ABI:
            /*const stakeABI = [
                'function stake(uint96 amount,uint256 until,address stakeFor,address delegatee)',
                'function pauseUnpause(bool _pause)',
                'function paused() view returns (bool)'
            ];*/
            const staking = await ethers.getContractAt(
                stakeABI,
                stakingProxy.address,
                deployerSigner
            );
            /*const multisigSigner = await getImpersonatedSignerFromJsonRpcProvider(
                (
                    await get("MultiSigWallet")
                ).address
            );*/
            if (await staking.paused()) await staking.connect(multisigSigner).pauseUnpause(false);
            const kickoffTS = await stakingProxy.kickoffTS();
            await staking.stake(whaleAmount, kickoffTS.add(MAX_DURATION), deployer, deployer);
            await mine();

            // CREATE PROPOSAL AND VERIFY
            console.log("creating proposal");
            const proposalIdBeforeSIP = await governorOwner.latestProposalIds(deployer);
            const sipArgsMyntIntegration: ISipArgument = await sipArgs.zeroMyntIntegrationSIP(hre);
            console.log("... before SIP creation");
            await hre.run("sips:create-sip", { argsFunc: "zeroMyntIntegrationSIP" });
            console.log("... after SIP creation");
            const proposalId = await governorOwner.latestProposalIds(deployer);
            expect(
                proposalId.toString(),
                "Proposal was not created. Check the SIP creation is not commented out."
            ).not.equal(proposalIdBeforeSIP.toString());

            // VOTE FOR PROPOSAL
            console.log("voting for proposal");
            await mine();
            await governorOwner.connect(deployerSigner).castVote(proposalId, true);

            // QUEUE PROPOSAL
            let proposal = await governorOwner.proposals(proposalId);
            await mineUpTo(proposal.endBlock);
            await mine();

            await governorOwner.queue(proposalId);

            // EXECUTE PROPOSAL
            proposal = await governorOwner.proposals(proposalId);
            await time.increaseTo(proposal.eta);
            await expect(governorOwner.execute(proposalId))
                .to.emit(governorOwner, "ProposalExecuted")
                .withArgs(proposalId);

            // VALIDATE EXECUTION
            expect((await governorOwner.proposals(proposalId)).executed).to.be.true;

            const borrowerOperationsProxy = await ethers.getContract("BorrowerOperations_Proxy");
            const borrowerOperationsImpl = await get("BorrowerOperations_Implementation"); //await ethers.getContract("BorrowerOperations");
            expect(
                ethers.utils.getAddress(await borrowerOperationsProxy.getImplementation())
            ).to.equal(ethers.utils.getAddress(borrowerOperationsImpl.address));

            const borrowerOperations = await ethers.getContract("BorrowerOperations");
            const massetManager = await get("MassetManager");
            expect(ethers.utils.getAddress(await borrowerOperations.massetManager())).to.equal(
                ethers.utils.getAddress(massetManager.address)
            );

            const stabilityPoolProxy = await ethers.getContract("StabilityPool_Proxy");
            const stabilityPool = await ethers.getContract("StabilityPool_Implementation");
            expect(ethers.utils.getAddress(await stabilityPoolProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(stabilityPool.address)
            );

            const troveManagerProxy = await ethers.getContract("TroveManager_Proxy");
            const troveManagerImpl = await get("TroveManager_Implementation");
            const troveManager = await ethers.getContract("TroveManager");
            const troveManagerRedeemOps = await ethers.getContract("TroveManagerRedeemOps");
            expect(ethers.utils.getAddress(await troveManagerProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(troveManagerImpl.address)
            ); // should not change
            expect(ethers.utils.getAddress(await troveManager.troveManagerRedeemOps())).to.equal(
                ethers.utils.getAddress(troveManagerRedeemOps.address)
            );

            const zusdTokenProxy = await ethers.getContract("ZUSDToken_Proxy");
            const zusdToken = await ethers.getContract("ZUSDToken_Implementation");
            expect(ethers.utils.getAddress(await zusdTokenProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(zusdToken.address)
            );
        });

        it("SIP-0055 is executable", async () => {
            if (!hre.network.tags["forked"]) return;
            await reset("https://mainnet-dev.sovryn.app/rpc", 5103312);
            /*await hre.network.provider.request({
                method: "hardhat_reset",
                params: [
                    {
                        forking: {
                            jsonRpcUrl: "https://mainnet-dev.sovryn.app/rpc",
                            blockNumber: 5103227,
                        },
                    },
                ],
            });*/

            const {
                deployer,
                deployerSigner,
                stakingProxy,
                stakingModulesProxy,
                governorOwner,
                governorOwnerSigner,
                timelockOwner,
                timelockOwnerSigner,
                multisigSigner,
            } = await setupTest();
            // loadFixtureAfterEach = true;

            // CREATE PROPOSAL
            const sov = await ethers.getContract("SOV", timelockOwnerSigner);
            //const whaleAmount = await sov.balanceOf(multisigSigner._address);
            //await sov.transfer(deployerSigner.address, whaleAmount);
            const whaleAmount = (await sov.totalSupply()).mul(ethers.BigNumber.from(5));

            await sov.mint(deployerSigner.address, whaleAmount);

            /*
            const quorumVotes = await governorOwner.quorumVotes();
            console.log('quorumVotes:', quorumVotes);
            */
            await sov.connect(deployerSigner).approve(stakingProxy.address, whaleAmount);
            //const stakeABI = (await hre.artifacts.readArtifact("IStaking")).abi;
            const stakeABI = (await deployments.getArtifact("IStaking")).abi;
            // const stakeABI = (await ethers.getContractFactory("IStaking")).interface;
            // alternatively for stakeABI can be used human readable ABI:
            /*const stakeABI = [
                'function stake(uint96 amount,uint256 until,address stakeFor,address delegatee)',
                'function pauseUnpause(bool _pause)',
                'function paused() view returns (bool)'
            ];*/
            const staking = await ethers.getContractAt(
                stakeABI,
                stakingProxy.address,
                deployerSigner
            );
            /*const multisigSigner = await getImpersonatedSignerFromJsonRpcProvider(
                (
                    await get("MultiSigWallet")
                ).address
            );*/
            if (await staking.paused()) await staking.connect(multisigSigner).pauseUnpause(false);
            const kickoffTS = await stakingProxy.kickoffTS();
            await staking.stake(whaleAmount, kickoffTS.add(MAX_DURATION), deployer, deployer);
            await mine();

            // CREATE PROPOSAL AND VERIFY
            const proposalIdBeforeSIP = await governorOwner.latestProposalIds(deployer);
            await hre.run("sips:create", { argsFunc: "zeroFeesUpdate" });
            const proposalId = await governorOwner.latestProposalIds(deployer);
            expect(
                proposalId.toString(),
                "Proposal was not created. Check the SIP creation is not commented out."
            ).not.equal(proposalIdBeforeSIP.toString());

            // VOTE FOR PROPOSAL
            console.log("voting for proposal");
            await mine();
            await governorOwner.connect(deployerSigner).castVote(proposalId, true);

            // QUEUE PROPOSAL
            let proposal = await governorOwner.proposals(proposalId);

            await mineUpTo(proposal.endBlock);
            await mine();

            await governorOwner.queue(proposalId);

            // EXECUTE PROPOSAL
            proposal = await governorOwner.proposals(proposalId);
            await time.increaseTo(proposal.eta);
            await expect(governorOwner.execute(proposalId))
                .to.emit(governorOwner, "ProposalExecuted")
                .withArgs(proposalId);

            // VALIDATE EXECUTION
            expect((await governorOwner.proposals(proposalId)).executed).to.be.true;

            const zeroBaseParams: LiquityBaseParams = <LiquityBaseParams>(
                (<unknown>await ethers.getContract("LiquityBaseParams"))
            );
            const newFeeValue = ethers.utils.parseEther("0.025");

            expect(await zeroBaseParams.BORROWING_FEE_FLOOR())
                .to.equal(await zeroBaseParams.REDEMPTION_FEE_FLOOR())
                .to.equal(newFeeValue);
        });

        it("Combo SIP-0054 and SIP-0055 is executable", async () => {
            if (!hre.network.tags["forked"]) return;
            await reset("https://mainnet-dev.sovryn.app/rpc", 5103312);
            const {
                deployer,
                deployerSigner,
                stakingProxy,
                stakingModulesProxy,
                governorOwner,
                governorOwnerSigner,
                timelockOwner,
                timelockOwnerSigner,
                multisigSigner,
            } = await setupTest();
            // loadFixtureAfterEach = true;

            // CREATE PROPOSAL
            const sov = await ethers.getContract("SOV", timelockOwnerSigner);
            //const whaleAmount = await sov.balanceOf(multisigSigner._address);
            //await sov.transfer(deployerSigner.address, whaleAmount);
            const whaleAmount = (await sov.totalSupply()).mul(ethers.BigNumber.from(5));

            await sov.mint(deployerSigner.address, whaleAmount);

            /*
            const quorumVotes = await governorOwner.quorumVotes();
            console.log('quorumVotes:', quorumVotes);
            */
            await sov.connect(deployerSigner).approve(stakingProxy.address, whaleAmount);
            //const stakeABI = (await hre.artifacts.readArtifact("IStaking")).abi;
            const stakeABI = (await deployments.getArtifact("IStaking")).abi;
            // const stakeABI = (await ethers.getContractFactory("IStaking")).interface;
            // alternatively for stakeABI can be used human readable ABI:
            /*const stakeABI = [
                'function stake(uint96 amount,uint256 until,address stakeFor,address delegatee)',
                'function pauseUnpause(bool _pause)',
                'function paused() view returns (bool)'
            ];*/
            const staking = await ethers.getContractAt(
                stakeABI,
                stakingProxy.address,
                deployerSigner
            );
            /*const multisigSigner = await getImpersonatedSignerFromJsonRpcProvider(
                (
                    await get("MultiSigWallet")
                ).address
            );*/
            if (await staking.paused()) await staking.connect(multisigSigner).pauseUnpause(false);
            const kickoffTS = await stakingProxy.kickoffTS();
            await staking.stake(whaleAmount, kickoffTS.add(MAX_DURATION), deployer, deployer);
            await mine();

            // CREATE PROPOSAL AND VERIFY
            console.log("creating proposal");
            const proposalIdBeforeSIP = await governorOwner.latestProposalIds(deployer);
            //const sipArgs: ISipArgument = await SIPArgs.sip0054And0055Combo(hre);
            //await createSIP(hre, sipArgs, "GovernorOwner");
            await hre.run("sips:create", { argsFunc: "sip0054And0055Combo" });
            console.log("... after SIP creating");
            const proposalId = await governorOwner.latestProposalIds(deployer);
            expect(
                proposalId.toString(),
                "Proposal was not created. Check the SIP creation is not commented out."
            ).not.equal(proposalIdBeforeSIP.toString());

            // VOTE FOR PROPOSAL
            console.log("voting for proposal");
            await mine();
            await governorOwner.connect(deployerSigner).castVote(proposalId, true);

            // QUEUE PROPOSAL
            let proposal = await governorOwner.proposals(proposalId);

            await mineUpTo(proposal.endBlock);
            await mine();

            await governorOwner.queue(proposalId);

            // EXECUTE PROPOSAL
            proposal = await governorOwner.proposals(proposalId);
            await time.increaseTo(proposal.eta);
            await expect(governorOwner.execute(proposalId))
                .to.emit(governorOwner, "ProposalExecuted")
                .withArgs(proposalId);

            // VALIDATE EXECUTION

            const borrowerOperationsProxy = await ethers.getContract("BorrowerOperations_Proxy");
            const borrowerOperationsImpl = await get("BorrowerOperations_Implementation"); //await ethers.getContract("BorrowerOperations");
            expect(
                ethers.utils.getAddress(await borrowerOperationsProxy.getImplementation())
            ).to.equal(ethers.utils.getAddress(borrowerOperationsImpl.address));

            const borrowerOperations = await ethers.getContract("BorrowerOperations");

            const massetManager = await get("MassetManager");
            expect(ethers.utils.getAddress(await borrowerOperations.massetManager())).to.equal(
                ethers.utils.getAddress(massetManager.address)
            );

            const stabilityPoolProxy = await ethers.getContract("StabilityPool_Proxy");
            const stabilityPool = await ethers.getContract("StabilityPool_Implementation");
            expect(ethers.utils.getAddress(await stabilityPoolProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(stabilityPool.address)
            );

            const troveManagerProxy = await ethers.getContract("TroveManager_Proxy");
            const troveManagerImpl = await get("TroveManager_Implementation");
            const troveManager = await ethers.getContract("TroveManager");
            const troveManagerRedeemOps = await ethers.getContract("TroveManagerRedeemOps");
            expect(ethers.utils.getAddress(await troveManagerProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(troveManagerImpl.address)
            ); // should not change
            expect(ethers.utils.getAddress(await troveManager.troveManagerRedeemOps())).to.equal(
                ethers.utils.getAddress(troveManagerRedeemOps.address)
            );

            const zusdTokenProxy = await ethers.getContract("ZUSDToken_Proxy");
            const zusdToken = await ethers.getContract("ZUSDToken_Implementation");
            expect(ethers.utils.getAddress(await zusdTokenProxy.getImplementation())).to.equal(
                ethers.utils.getAddress(zusdToken.address)
            );

            expect((await governorOwner.proposals(proposalId)).executed).to.be.true;

            const zeroBaseParams: LiquityBaseParams = <LiquityBaseParams>(
                (<unknown>await ethers.getContract("LiquityBaseParams"))
            );
            const newFeeValue = ethers.utils.parseEther("0.025");

            expect(await zeroBaseParams.BORROWING_FEE_FLOOR())
                .to.equal(await zeroBaseParams.REDEMPTION_FEE_FLOOR())
                .to.equal(newFeeValue);
        });

        it("SIP-0059 is executable", async () => {
            if (!hre.network.tags["forked"]) return;
            await reset("https://mainnet-dev.sovryn.app/rpc", 5149167);
            /*await hre.network.provider.request({
                method: "hardhat_reset",
                params: [
                    {
                        forking: {
                            jsonRpcUrl: "https://mainnet-dev.sovryn.app/rpc",
                            blockNumber: 5103227,
                        },
                    },
                ],
            });*/
            const {
                deployer,
                deployerSigner,
                stakingProxy,
                governorOwner,
                timelockOwnerSigner,
                multisigSigner,
            } = await setupTest();
            // loadFixtureAfterEach = true;
            // CREATE PROPOSAL
            const sov = await ethers.getContract("SOV", timelockOwnerSigner);
            const whaleAmount = (await sov.totalSupply()).mul(ethers.BigNumber.from(5));
            await sov.mint(deployerSigner.address, whaleAmount);

            /*
            const quorumVotes = await governorOwner.quorumVotes();
            console.log('quorumVotes:', quorumVotes);
            */
            await sov.connect(deployerSigner).approve(stakingProxy.address, whaleAmount);
            //const stakeABI = (await hre.artifacts.readArtifact("IStaking")).abi;
            const stakeABI = (await deployments.getArtifact("IStaking")).abi;
            // const stakeABI = (await ethers.getContractFactory("IStaking")).interface;
            // alternatively for stakeABI can be used human readable ABI:
            /*const stakeABI = [
                'function stake(uint96 amount,uint256 until,address stakeFor,address delegatee)',
                'function pauseUnpause(bool _pause)',
                'function paused() view returns (bool)'
            ];*/
            const staking = await ethers.getContractAt(
                stakeABI,
                stakingProxy.address,
                deployerSigner
            );
            /*const multisigSigner = await getImpersonatedSignerFromJsonRpcProvider(
                (
                    await get("MultiSigWallet")
                ).address
            );*/
            if (await staking.paused()) await staking.connect(multisigSigner).pauseUnpause(false);
            const kickoffTS = await stakingProxy.kickoffTS();
            await staking.stake(whaleAmount, kickoffTS.add(MAX_DURATION), deployer, deployer);
            await mine();

            // CREATE PROPOSAL AND VERIFY
            const proposalIdBeforeSIP = await governorOwner.latestProposalIds(deployer);
            await hre.run("sips:create", { argsFunc: "zeroFeesUpdateSip0059" });
            const proposalId = await governorOwner.latestProposalIds(deployer);
            expect(
                proposalId.toString(),
                "Proposal was not created. Check the SIP creation is not commented out."
            ).not.equal(proposalIdBeforeSIP.toString());

            // VOTE FOR PROPOSAL
            console.log("voting for proposal");
            await mine();
            await governorOwner.connect(deployerSigner).castVote(proposalId, true);

            // QUEUE PROPOSAL
            let proposal = await governorOwner.proposals(proposalId);

            await mineUpTo(proposal.endBlock);
            await mine();

            await governorOwner.queue(proposalId);

            // EXECUTE PROPOSAL
            proposal = await governorOwner.proposals(proposalId);
            await time.increaseTo(proposal.eta);
            await expect(governorOwner.execute(proposalId))
                .to.emit(governorOwner, "ProposalExecuted")
                .withArgs(proposalId);

            // VALIDATE EXECUTION
            expect((await governorOwner.proposals(proposalId)).executed).to.be.true;

            const zeroBaseParams: LiquityBaseParams = <LiquityBaseParams>(
                (<unknown>await ethers.getContract("LiquityBaseParams"))
            );
            const newBorrowingFeeFloor = ethers.utils.parseEther("0.05");
            const newMaxBorrowingFee = ethers.utils.parseEther("0.075");
            const newRedemptionFeeFloor = ethers.utils.parseEther("0.019");

            expect(await zeroBaseParams.BORROWING_FEE_FLOOR()).to.equal(newBorrowingFeeFloor);
            expect(await zeroBaseParams.MAX_BORROWING_FEE()).to.equal(newMaxBorrowingFee);
            expect(await zeroBaseParams.REDEMPTION_FEE_FLOOR()).to.equal(newRedemptionFeeFloor);
        });
    });
});
