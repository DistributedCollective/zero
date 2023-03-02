import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy, injectHre } from "../../scripts/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/utils";
const path = require("path");
const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));

const func: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    console.log("deployer", deployer);
    injectHre(hre);
    await deployWithCustomProxy(deployer, deploymentName, "UpgradableProxy");

    /*    await deployments.execute(
            "MassetManager",
            { from: deployer },
            "initialize",
            deployedBasketManager.address,
            deployedToken.address,
            false
        );
        */
};

func.tags = [deploymentName];
export default func;
