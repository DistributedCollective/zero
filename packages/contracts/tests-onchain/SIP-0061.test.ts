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

const {
    ethers,
    deployments,
    deployments: { createFixture, get },
} = hre;

import sipArgs, { ISipArgument } from "../tasks/sips/args/sipArgs";

import { GovernorAlpha, LiquityBaseParams } from "types/generated";
import { ERC20 } from "types/generated/external/artifacts";

const TWO_DAYS = 86400 * 2;
// const MAX_DURATION = new BN(24 * 60 * 60).mul(new BN(1092));
const MAX_DURATION = ethers.BigNumber.from(24 * 60 * 60).mul(1092);

const ONE_RBTC = ethers.utils.parseEther("1.0");

describe("SIP-0061: Zero stability pool subsidies", () => {
    const getImpersonatedSignerFromJsonRpcProvider = async (addressToImpersonate) => {
        const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
        await provider.send("hardhat_impersonateAccount", [addressToImpersonate]);
        return provider.getSigner(addressToImpersonate);
    };

    const setupTest = createFixture(async ({ deployments, getNamedAccounts }) => {
        const { deployer } = await getNamedAccounts();

        const deployerSigner = await ethers.getSigner(deployer);
        await setBalance(deployer, ONE_RBTC.mul(10));

        const stakingProxy = await ethers.getContract("StakingProxy", deployer);
        const stakingModulesProxy = await ethers.getContract("StakingModulesProxy", deployer);

        const god = await deployments.get("GovernorOwner");
        const governorOwner = await ethers.getContract("GovernorOwner");

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
        await reset("https://mainnet-dev.sovryn.app/rpc", 5252500);
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await snapshot.restore();
    });

    it("SIP-0061 is executable", async () => {
        if (!hre.network.tags["forked"]) return;
        /*await hre.network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: "https://mainnet-dev.sovryn.app/rpc",
                        blockNumber: 5252500,
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

        // DEPLOY CONTRACTS
        await deployments.fixture(["StabilityPool", "CommunityIssuance"], {
            keepExistingDeployments: true,
        });

        // CREATE PROPOSAL
        const sov = await ethers.getContract("SOV", timelockOwnerSigner);

        const whaleAmount = (await sov.totalSupply()).mul(ethers.BigNumber.from(5));

        await sov.mint(deployerSigner.address, whaleAmount);

        await sov.connect(deployerSigner).approve(stakingProxy.address, whaleAmount);

        const stakeABI = (await deployments.getArtifact("IStaking")).abi;

        const staking = await ethers.getContractAt(stakeABI, stakingProxy.address, deployerSigner);

        if (await staking.paused()) await staking.connect(multisigSigner).pauseUnpause(false);
        const kickoffTS = await stakingProxy.kickoffTS();
        await staking.stake(whaleAmount, kickoffTS.add(MAX_DURATION), deployer, deployer);
        await mine();

        // CREATE PROPOSAL AND VERIFY
        console.log("creating proposal");
        const proposalIdBeforeSIP = await governorOwner.latestProposalIds(deployer);
        //const sipArgsZFU: ISipArgument = await sipArgs.sip0061(hre);
        //await createSIP(hre, sipArgsZFU);
        await hre.run("sips:create-sip", { argsFunc: "sip0061" });
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
        console.log("queueing proposal");
        let proposal = await governorOwner.proposals(proposalId);

        await mineUpTo(proposal.endBlock);
        await mine();

        await governorOwner.queue(proposalId);

        // EXECUTE PROPOSAL
        console.log("executing proposal");
        proposal = await governorOwner.proposals(proposalId);
        await time.increaseTo(proposal.eta);
        await expect(governorOwner.execute(proposalId))
            .to.emit(governorOwner, "ProposalExecuted")
            .withArgs(proposalId);

        // VALIDATE EXECUTION
        expect((await governorOwner.proposals(proposalId)).executed).to.be.true;

        const stabilityPoolProxy = await ethers.getContract("StabilityPool_Proxy");
        const stabilityPoolImpl = await ethers.getContract("StabilityPool_Implementation");
        const stabilityPool = await ethers.getContract("StabilityPool");
        const communityIssuance = await ethers.getContract("CommunityIssuance");

        expect(ethers.utils.getAddress(await stabilityPoolProxy.getImplementation())).to.equal(
            ethers.utils.getAddress(stabilityPoolImpl.address)
        );
        expect(ethers.utils.getAddress(await stabilityPool.communityIssuance())).to.equal(
            ethers.utils.getAddress(communityIssuance.address)
        );
    });
});
