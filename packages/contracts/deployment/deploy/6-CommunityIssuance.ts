import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy } from "../../scripts/helpers/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/helpers/utils";
import Logs from "node-logs";
import { CommunityIssuance } from "types/generated";
import { CommunityIssuanceInterface } from "types/generated/artifacts/contracts/ZERO/CommunityIssuance";
const path = require("path");
const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));
const logger = new Logs().showInConsole(true);

const func: DeployFunction = async (hre) => {
    const {
        getNamedAccounts,
        ethers,
        deployments: { get, getOrNull },
    } = hre;
    const { deployer } = await getNamedAccounts();

    if (!(hre.network.tags["mainnet"] || hre.network.tags["testnet"])) {
        logger.error(
            "Current deployment is designed to work only on the testnet/mainnet or forked testnet/mainnet"
        );
        return;
    }

    // Initialize community issuance address
    const zusdTokenAddress = (await get("ZUSDToken")).address;
    const stabilityPoolAddress = (await get("StabilityPool")).address;
    const APR = 500;
    const priceFeedsAddress = (await get("PriceFeeds")).address;
    const sovTokenAddress = (await get("SOV")).address;

    const rewardManagerAddress = (
        hre.network.tags["mainnet"] ? await get("TimelockAdmin") : await get("MultiSigContract")
    ).address;
    const ownerAddress = (
        hre.network.tags["mainnet"] ? await get("TimelockOwner") : await get("MultiSigContract")
    ).address;

    const newlyDeployedProxy = (await getOrNull("CommunityIssuance_Proxy")) ? false : true;
    await deployWithCustomProxy(hre, deployer, deploymentName, "UpgradableProxy");

    const communityIssuanceDeployment = await get(deploymentName);
    const communityIssuance = await ethers.getContractAt(
        communityIssuanceDeployment.abi,
        communityIssuanceDeployment.address
    );

    if (newlyDeployedProxy) {
        logger.info("=== Initializing Community Issuance ===");
        logger.info(`SOV Token Address: ${sovTokenAddress}`);
        logger.info(`ZUSD Token Address: ${zusdTokenAddress}`);
        logger.info(`Stability Pool Address: ${stabilityPoolAddress}`);
        logger.info(`PriceFeeds Address: ${priceFeedsAddress}`);
        logger.info(`APR: ${APR}`);

        const receipt1 = await (
            await communityIssuance.initialize(
                sovTokenAddress,
                zusdTokenAddress,
                stabilityPoolAddress,
                priceFeedsAddress,
                APR
            )
        ).wait();
        logger.success("=== Community Issuance has been initialized ===");
        logger.success(receipt1);
    }

    if ((await communityIssuance.rewardManager()) !== rewardManagerAddress) {
        // Set reward manager
        logger.info(`=== Setting Reward Manager ${rewardManagerAddress} ===`);
        const receipt2 = await (
            await communityIssuance.setRewardManager(rewardManagerAddress)
        ).wait();
        logger.success(`=== Reward manger has been set to ${rewardManagerAddress} ===`);
        logger.success(receipt2);
    }

    if ((await communityIssuance.getOwner()) !== ownerAddress) {
        // Transfer ownership
        logger.info(`=== Transferring ownership to TimelockOwner ${ownerAddress} ===`);
        const receipt3 = await (await communityIssuance.setOwner(ownerAddress)).wait();
        logger.success(`=== Ownership has been transferred to ${ownerAddress} ===`);
        logger.success(receipt3);
    }
};

func.tags = [deploymentName];
export default func;
