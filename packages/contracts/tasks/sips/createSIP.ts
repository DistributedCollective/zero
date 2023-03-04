/* eslint-disable no-console */
import { task } from "hardhat/config";
import Logs from "node-logs";
import SIPArgs, { ISipArgument } from "./args/SIPArgs";

const logger = new Logs().showInConsole(true);

task("sips:verify-sip-agrs", "Verify SIP Args")
    .addParam(
        "sipArgsFunction",
        "SIP args construction function that is located in and exported from tasks/sips/args/SIPArgs.ts which returns SIP args"
    )
    .setAction(async ({ sipArgsFunction }, hre) => {
        const sipArgs: ISipArgument = await SIPArgs[sipArgsFunction](hre);
        logger.information(sipArgs);
    });

task("sips:create-sip", "Create SIP to Sovryn Governance")
    .addParam(
        "sipArgsFunction",
        "SIP args construction function that is located in and exported from tasks/sips/args/SIPArgs.ts which returns SIP args"
    )
    .setAction(async ({ sipArgsFunction }, hre) => {
        const sipArgs: ISipArgument = await SIPArgs[sipArgsFunction](hre);
        await createSIP(hre, sipArgs);
    });

export const createSIP = async (hre, sipArgs: ISipArgument) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const Governor = await get("GovernorOwner");
    const governor = await ethers.getContractAt(Governor.abi, Governor.address);

    logger.info("=== Creating SIP ===");
    logger.info(`Governor Address:    ${governor.address}`);
    logger.info(`Targets:             ${sipArgs.targets}`);
    logger.info(`Values:              ${sipArgs.values}`);
    logger.info(`Signatures:          ${sipArgs.signatures}`);
    logger.info(`Data:                ${sipArgs.data}`);
    logger.info(`Description:         ${sipArgs.description}`);
    logger.info(`============================================================='`);

    const tx = await governor.propose(
        sipArgs.targets,
        sipArgs.values,
        sipArgs.signatures,
        sipArgs.data,
        sipArgs.description
    );
    const receipt = await tx.wait();

    const eventData = governor.interface.parseLog(receipt.logs[0])["args"];

    logger.info(eventData);

    logger.success("=== SIP has been created ===");
    logger.success(`Governor Address:     ${governor.address}`);
    logger.success(`Proposal ID:          ${eventData.id.toString()}`);
    logger.success(`Porposer:             ${eventData.proposer}`);
    logger.success(`Targets:              ${eventData.targets}`);
    logger.success(`Values:               ${eventData.values}`);
    logger.success(`Signatures:           ${eventData.signatures}`);
    logger.success(`Data:                 ${eventData.calldatas}`);
    logger.success(`Description:          ${eventData.description}`);
    logger.success(`Start Block:          ${eventData.startBlock}`);
    logger.success(`End Block:            ${eventData.endBlock}`);
    logger.success(`============================================================='`);
};
