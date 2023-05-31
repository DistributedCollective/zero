import { DeployFunction } from "hardhat-deploy/types";
import { getContractNameFromScriptFileName } from "../../scripts/helpers/utils";
const path = require("path");
import Logs from "node-logs";
import { TroveManager } from "types/generated";
const logger = new Logs().showInConsole(true);

const deploymentName = getContractNameFromScriptFileName(path.basename(__filename));

const func: DeployFunction = async ({ ethers, getNamedAccounts, deployments, network }) => {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const troveManager: TroveManager = (await ethers.getContract(
        "TroveManager"
    )) as unknown as TroveManager;
    const tx = await deploy(deploymentName, {
        from: deployer,
        args: [(await troveManager.BOOTSTRAP_PERIOD()).toString()],
        log: true,
    });

    const prevImpl = await troveManager.troveManagerRedeemOps();
    log(`Current ${deploymentName}: ${prevImpl}`);

    if (tx.newlyDeployed || tx.address != prevImpl) {
        if (tx.address != prevImpl) {
            logger.information(
                `${deploymentName} is reused. However it was not set in the TroveManager contract as troveManagerRedeemOps yet.`
            );
        }
        if (network.tags.testnet) {
            console.log("testnet");
            // multisig tx
        } else if (network.tags.mainnet) {
            // create SIP message
            console.log("mainnet");
            logger.info(`>>> Add ${deploymentName} address ${tx.address} update to a SIP`);
        } else {
            // just replace logic directly
            console.log("else!");
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
