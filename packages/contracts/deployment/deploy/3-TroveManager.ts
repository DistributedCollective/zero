import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy, injectHre } from "../../scripts/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/utils";
const path = require("path");
const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));

const func: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    injectHre(hre);
    await deployWithCustomProxy(deployer, deploymentName, "UpgradableProxy", false, "", "", [
        "1209600",
    ]);
};

func.tags = [deploymentName];
export default func;
