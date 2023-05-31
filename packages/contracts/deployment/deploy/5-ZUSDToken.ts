import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy } from "../../scripts/helpers/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/helpers/utils";
const path = require("path");

const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));

const func: DeployFunction = async ({ getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts();
    await deployWithCustomProxy(deployer, deploymentName, "UpgradableProxy");
};

func.tags = [deploymentName];
export default func;
