import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy, injectHre } from "../../scripts/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/utils";
import Logs from "node-logs";
const path = require("path");
const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));
const logger = new Logs().showInConsole(true);

const func: DeployFunction = async (hre) => {
    const { getNamedAccounts, ethers, deployments: { get }} = hre;
    const { deployer } = await getNamedAccounts();
    injectHre(hre);
    await deployWithCustomProxy(deployer, deploymentName, "UpgradableProxy");

    const communityIssuanceDeployment = await get(deploymentName);
    const communityIssuance = await ethers.getContractAt(communityIssuanceDeployment.abi, communityIssuanceDeployment.address);

    // Initialize community issuance address
    let sovTokenAddress: string;
    let priceFeedsAddress: string;
    let rewardManagerAddress: string;
    let ownerAddress: string;
    const zusdTokenAddress = (await get("ZUSDToken")).address;
    const stabilityPoolAddress = (await get("StabilityPool")).address;
    const APR = 500;

    if (hre.network.tags["mainnet"]) {
        sovTokenAddress = "0xEFc78fc7d48b64958315949279Ba181c2114ABBd";
        priceFeedsAddress = "0x437AC62769f386b2d238409B7f0a7596d36506e4";
        rewardManagerAddress = "0x6c94c8aa97C08fC31fb06fbFDa90e1E09529FB13"; // timelockAdmin for mainnet
        ownerAddress = "0x967c84b731679E36A344002b8E3CE50620A7F69f"; // timelockOwner for mainnet
    } else {
        sovTokenAddress = "0x6a9A07972D07e58F0daf5122d11E069288A375fb";
        priceFeedsAddress = "0x7f38c422b99075f63C9c919ECD200DF8d2Cf5BD4";
        rewardManagerAddress = "0x189ecD23E9e34CFC07bFC3b7f5711A23F43F8a57"; // exchequer for testnet
        ownerAddress = "0x189ecD23E9e34CFC07bFC3b7f5711A23F43F8a57"; // exchequer for testnet
    }

    const tx1 = await communityIssuance.initialize(
        sovTokenAddress,
        zusdTokenAddress,
        stabilityPoolAddress,
        priceFeedsAddress,
        APR,
    );

    logger.info("=== Initializing Community Issuance ===");
    logger.info(`SOV Token Address: ${sovTokenAddress}`);
    logger.info(`ZUSD Token Address: ${zusdTokenAddress}`);
    logger.info(`Stability Pool Address: ${stabilityPoolAddress}`);
    logger.info(`PriceFeeds Address: ${priceFeedsAddress}`);
    logger.info(`APR: ${APR}`);

    const receipt1 = await tx1.wait();
    logger.success("=== Community Issuance has been initialized ===");
    logger.success(receipt1);

    // Set reward manager
    const tx2 = await communityIssuance.setRewardManager(rewardManagerAddress);
    
    logger.info(`=== Setting Reward Manager ${rewardManagerAddress} ===`);
    const receipt2 = await tx2.wait();
    logger.success(`=== Reward manger has been set to ${rewardManagerAddress} ===`);
    logger.success(receipt2);

    // Transfer ownership
    const tx3 = await communityIssuance.setOwner(ownerAddress);
    
    logger.info(`=== Transferring ownership to TimelockOwner ${ownerAddress} ===`);
    const receipt3 = await tx3.wait();
    logger.success(`=== Ownership has been transferred to ${ownerAddress} ===`);
    logger.success(receipt3);
};

func.tags = [deploymentName];
export default func;
