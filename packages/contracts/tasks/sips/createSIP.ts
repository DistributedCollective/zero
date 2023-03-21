/* eslint-disable no-console */
import { task } from "hardhat/config";
import Logs from "node-logs";
import sipArgsList, { ISipArgument } from "./args/sipArgs";

const logger = new Logs().showInConsole(true);

task("sips:verify-agrs", "Verify SIP Args")
    .addParam(
        "argsFunc",
        "SIP args construction function that is located in and exported from tasks/sips/args/SIPArgs.ts which returns SIP args"
    )
    .setAction(async ({ argsFunc }, hre) => {
        const sipArgs: ISipArgument = await sipArgsList[argsFunc](hre);
        logger.information(sipArgs);
    });

task("sips:create", "Create SIP to Sovryn Governance")
    .addParam(
        "argsFunc",
        "Function name from tasks/sips/args/sipArgs.ts that returns the sip arguments"
    )
    .setAction(async ({ argsFunc }, hre) => {
        const sipArgs: ISipArgument = await sipArgsList[argsFunc](hre);
        await createSIP(hre, sipArgs);
    });

export const createSIP = async (hre, sipArgs: ISipArgument) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const Governor = await get(sipArgs.governorName);
    const governor = await ethers.getContractAt(Governor.abi, Governor.address);
    const args = sipArgs.args;
    logger.info("=== Creating SIP ===");
    logger.info(`Governor Address:    ${governor.address}`);
    logger.info(`Targets:             ${args.targets}`);
    logger.info(`Values:              ${args.values}`);
    logger.info(`Signatures:          ${args.signatures}`);
    logger.info(`Data:                ${args.data}`);
    logger.info(`Description:         ${args.description}`);
    logger.info(`============================================================='`);

    const tx = await governor.propose(
        args.targets,
        args.values,
        args.signatures,
        args.data,
        args.description
    );

    /*
    const tx = await governor.populateTransaction.propose(
        args.targets,
        args.values,
        args.signatures,
        args.data,
        args.description
    );
    console.log("Populated SIP tx:");
    console.log(tx);
    */

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
