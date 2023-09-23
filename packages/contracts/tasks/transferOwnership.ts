import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import Logs from "node-logs";
import * as helpers from "../scripts/helpers/helpers";

const logger = new Logs().showInConsole(true);

task("ownership:transfer", "Upgrade implementation of feesManager contract")
    .addParam("newOwner", "New address of the owner", undefined, types.string, false)
    .addVariadicPositionalParam(
        "contractAddresses",
        "Array of contract address which ownership will be transferred"
    )
    .addOptionalParam(
        "isMultisig",
        "flag if transaction needs to be intiated from the multisig contract"
    )
    .setAction(async ({ contractAddresses, newOwner, isMultisig }, hre) => {
        await Promise.all(
            contractAddresses.map(async (contractAddress) => {
                await transferOwnership(hre, contractAddress, newOwner, isMultisig);
            })
        );
    });

// eslint-disable-next-line no-underscore-dangle
export const transferOwnership = async (
    hre: HardhatRuntimeEnvironment,
    contractAddress: string,
    newOwner: string,
    isMultisig = false
) => {
    const {
        ethers,
        getNamedAccounts,
        deployments: { get },
    } = hre;
    const ownableABI = [
        "function transferOwnership(address newOwner)",
        "function owner() view returns(address)",
    ];
    const ownable = await ethers.getContractAt(ownableABI, contractAddress);

    if (isMultisig) {
        const { deployer } = await getNamedAccounts();
        const multisigAddress = (await get("MultiSigWallet")).address;
        const data = ownable.interface.encodeFunctionData("transferOwnership", [newOwner]);

        await helpers.sendWithMultisig(hre, multisigAddress, contractAddress, data, deployer);
    } else {
        await (await ownable.transferOwnership(newOwner)).wait();
        if ((await ownable.owner()) === newOwner) {
            logger.success(
                `Contract ${contractAddress} ownership has been transferred to: ${await ownable.owner()}`
            );
        } else {
            logger.error(
                `Contract ${contractAddress} ownership has NOT been transferred to: ${await ownable.owner()}`
            );
        }
    }
};
