import { DeployFunction } from "hardhat-deploy/types";
import { deployWithCustomProxy } from "../../scripts/helpers";
import { getContractNameFromScriptFileName } from "../../scripts/utils";
const path = require("path");
import Logs from "node-logs";
const logger = new Logs().showInConsole(true);

const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));

const func: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const tx = await deploy(deploymentName, {
        from: deployer,
        args: [],
        log: true,
    });

    if (tx.newlyDeployed) {
        if (network.tags.testnet) {
            // multisig tx
        } else if (network.tags.mainnet) {
            // create SIP message
            logger.info(`>>> Add ${deploymentName} address ${tx.address} update to a SIP`);
        } else {
            // just replace logic directly
            await deployments.execute(
                "TroveManager",
                { from: deployer },
                "setTroveManagerRedeemOps",
                tx.address
            );
        }
    }
};

func.tags = [deploymentName];
func.dependencies = ["TroveManager"];
export default func;
