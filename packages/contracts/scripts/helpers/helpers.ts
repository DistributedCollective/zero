/* eslint-disable no-plusplus */
import { Interface } from "@ethersproject/abi/lib/interface";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, BytesLike, Contract, ContractInterface, Signer } from "ethers";

import { TransactionReceipt, TransactionResponse } from "@ethersproject/providers";
import { Address } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { GovernorAlpha, MultiSigWallet } from "types/generated";
import Logs from "node-logs";
const logger = new Logs().showInConsole(true);

const encodeParameters = (hre: HardhatRuntimeEnvironment, types, values) => {
    const { ethers } = hre;
    const abi = new ethers.utils.AbiCoder();
    return abi.encode(types, values);
};

const sendWithMultisig = async (
    hre: HardhatRuntimeEnvironment,
    multisigAddress: Address,
    contractAddress: Address,
    data: BytesLike,
    sender: Address,
    value = 0
) => {
    const { ethers } = hre;
    const multisig = await ethers.getContractAt("MultiSigWallet", multisigAddress);
    const signer = await ethers.getSigner(sender);
    const receipt = await (
        await multisig.connect(signer).submitTransaction(contractAddress, value, data)
    ).wait();

    const abi = ["event Submission(uint256 indexed transactionId)"];
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = await getParsedEventLogFromReceipt(receipt, iface, "Submission");
    await multisigCheckTx(hre, parsedEvent.transactionId.value.toNumber(), multisig.address);
};

const signWithMultisig = async (hre: HardhatRuntimeEnvironment, multisigAddress, txId, sender) => {
    const { ethers } = hre;
    console.log("Signing multisig txId:", txId);
    const multisig = await ethers.getContractAt("MultiSigWallet", multisigAddress);
    const signer = await ethers.getSigner(sender);
    await (await multisig.connect(signer).confirmTransaction(txId)).wait();
    // console.log("Required signatures:", await multisig.required());
    console.log("Signed. Details:");
    await multisigCheckTx(txId, multisig.address);
};

const multisigAddOwner = async (hre: HardhatRuntimeEnvironment, addAddress, sender) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const multisigDeployment = await get("MultiSigWallet");
    let multisigInterface = new ethers.utils.Interface(multisigDeployment.abi);
    let data = multisigInterface.encodeFunctionData("addOwner", [addAddress]);
    ///@todo check if the deployer is one of ms owners
    console.log(`creating multisig tx to add new owner ${addAddress}...`);
    await sendWithMultisig(
        hre,
        multisigDeployment.address,
        multisigDeployment.address,
        data,
        sender
    );
    logger.info(
        `>>> DONE. Requires Multisig (${multisigDeployment.address}) signing to execute tx <<<`
    );
};

const multisigRemoveOwner = async (hre: HardhatRuntimeEnvironment, removeAddress, sender) => {
    const {
        ethers,
        getNamedAccounts,
        deployments: { get },
    } = hre;
    const multisigDeployment = await get("MultiSigWallet");
    let multisigInterface = new ethers.utils.Interface(multisigDeployment.abi);
    let data = multisigInterface.encodeFunctionData("removeOwner", [removeAddress]);
    console.log(`creating multisig tx to remove owner ${removeAddress}...`);
    await sendWithMultisig(
        hre,
        multisigDeployment.address,
        multisigDeployment.address,
        data,
        sender
    );
    logger.info(
        `>>> DONE. Requires Multisig (${multisigDeployment.address}) signing to execute tx <<<`
    );
};

const multisigExecuteTx = async (
    hre: HardhatRuntimeEnvironment,
    txId,
    sender,
    multisigAddress: string | undefined = undefined
) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const signer = await ethers.getSigner(sender);
    const multisig = await ethers.getContractAt(
        "MultiSigWallet",
        multisigAddress === undefined ? (await get("MultiSigWallet")).address : multisigAddress,
        signer
    );
    console.log("Executing multisig txId", txId, "...");
    const gasEstimated = (await multisig.estimateGas.executeTransaction(txId)).toNumber();
    console.log("Estimated Gas:", gasEstimated);
    const lastBlock = await ethers.provider.getBlock("latest");
    const lastBlockGasLimit = lastBlock.gasLimit.toNumber();
    console.log("Last Block Gas Limit:", lastBlockGasLimit);
    const gasEstimatedMul = gasEstimated * 1.3;

    let receipt;
    let wontExecute = false;
    if (gasEstimatedMul < lastBlockGasLimit) {
        try {
            await multisig.callStatic.executeTransaction(txId, { gasEstimatedMul });
            receipt = await (await multisig.executeTransaction(txId, { gasEstimatedMul })).wait();
        } catch (e) {
            wontExecute = true;
        }
    }
    if (wontExecute || gasEstimatedMul >= lastBlockGasLimit) {
        receipt = await (
            await multisig.executeTransaction(txId, { gasLimit: lastBlockGasLimit })
        ).wait();
    }

    logger.warn("===============================================================================");
    logger.success("DONE. Details:");
    console.log("Tx hash:", receipt.transactionHash);
    console.log("Gas used:", receipt.gasUsed.toNumber());
    await multisigCheckTx(txId, multisig.address);
    logger.warn("===============================================================================");
};

const multisigCheckTx = async (
    hre: HardhatRuntimeEnvironment,
    txId,
    multisigAddress: string | undefined = undefined
) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const multisig = await ethers.getContractAt(
        "MultiSigWallet",
        multisigAddress === undefined ? (await get("MultiSigWallet")).address : multisigAddress
    );
    const transaction = await multisig.transactions(txId);
    console.log(
        "TX { ID: ",
        txId,
        ", Data: ",
        transaction.data,
        ", Value: ",
        transaction.value.toString(),
        ", Destination: ",
        transaction.destination,
        ", Confirmations: ",
        (await multisig.getConfirmationCount(txId)).toNumber(),
        ", Executed:",
        transaction.executed,
        ", Confirmed by:",
        await multisig.getConfirmations(txId),
        "}"
    );
};

const isMultisigOwner = async (hre: HardhatRuntimeEnvironment, multisigAddress, checkAddress) => {
    const { ethers } = hre;
    const multisig = await ethers.getContractAt("MultiSigWallet", multisigAddress);
    return await multisig.isOwner(checkAddress);
};

const multisigRevokeConfirmation = async (
    hre: HardhatRuntimeEnvironment,
    txId,
    sender,
    multisigAddress: string | undefined = undefined
) => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const signer = await ethers.getSigner(sender);
    const multisig = await ethers.getContractAt(
        "MultiSigWallet",
        multisigAddress === undefined ? (await get("MultiSigWallet")).address : multisigAddress,
        signer
    );
    console.log("Revoking confirmation of txId", txId, "...");
    await (await multisig.revokeConfirmation(txId)).wait();
    // console.log("Required signatures:", await multisig.required());
    console.log(`Confirmation of txId ${txId} revoked.`);
    console.log("Details:");
    await multisigCheckTx(txId, multisig.address);
};

const parseEthersLogToValue = (parsed) => {
    let parsedEvent = {};
    for (let i = 0; i < parsed.args.length; i++) {
        const input = parsed.eventFragment.inputs[i];
        const arg = parsed.args[i];
        const newObj = { ...input, ...{ value: arg.toString() } };
        parsedEvent[input["name"]] = newObj.value;
    }
    return parsedEvent;
};

const getTxLog = (tx, contract) => {
    return tx.logs.map((log) => parseEthersLogToValue(contract.interface.parseLog(log)));
};

const parseEthersLog = (parsed) => {
    const parsedEvent: any = {};
    for (let i = 0; i < parsed.args.length; i++) {
        const input = parsed.eventFragment.inputs[i];
        const arg = parsed.args[i];
        const newObj = { ...input, ...{ value: arg } };
        parsedEvent[input.name] = newObj;
    }
    return parsedEvent;
};

const getEthersLog = async (contract: Contract, filter) => {
    if (contract === undefined || filter === undefined) return;
    const events = await contract.queryFilter(filter);
    if (events.length === 0) return;
    const parsedEvents: any[] = [];
    events.forEach(({ topics: topicsR, data }) => {
        // const { topics, data } = event;
        const topics: string[] = topicsR.forEach((el) => el.toString()) as unknown as string[];
        const ethersParsed = contract.interface.parseLog({ topics, data });
        const customParsed = parseEthersLog(ethersParsed);
        parsedEvents.push(customParsed);
    });
    return parsedEvents;
};

const getParsedEventLogFromReceipt = async (
    receipt: TransactionReceipt,
    iface: Interface,
    eventName: string
) => {
    const topic = iface.getEventTopic(eventName);
    // search for the log by the topic
    const log = receipt.logs.find((x) => x.topics.indexOf(topic) >= 0) as unknown as {
        topics: Array<string>;
        data: string;
    };
    // finally, you can parse the log with the interface
    // to get a more user-friendly event object
    const parsedLog = iface.parseLog(log);
    return parseEthersLog(parsedLog);
};

const createProposal = async (
    hre,
    governorAddress,
    targets,
    values,
    signatures,
    callDatas,
    description,
    signer
) => {
    const { ethers } = hre;
    console.log(`=============================================================
    Governor Address:    ${governorAddress}
    Target:              ${targets}
    Values:              ${values}
    Signature:           ${signatures}
    Data:                ${callDatas}
    Description:         ${description}
    =============================================================`);
    const gov = await ethers.getContractAt("GovernorAlpha", governorAddress);
    const tx = await (
        await gov.connect(signer).propose(targets, values, signatures, callDatas, description)
    ).wait();
    console.log(tx);
};

const defaultValueMultisigOrSipFlag = (
    networkTags: Record<string, boolean>
): { isMultisigFlag: boolean; isSIPFlag: boolean } => {
    let isMultisigFlag: boolean = false;
    let isSIPFlag: boolean = false;
    if (networkTags.testnet) {
        isMultisigFlag = true;
    } else if (networkTags.mainnet) {
        isSIPFlag = true;
    } else {
        throw new Error(`Non-supported ${JSON.stringify(networkTags)} network tags`);
    }

    return { isMultisigFlag, isSIPFlag };
};

const deployWithCustomProxy = async (
    hre,
    deployer,
    logicName,
    proxyName,
    isOwnerMultisig = false,
    multisigName = "MultiSigWallet",
    proxyOwner = "",
    args: any[] = [],
    proxyArgs: any[] = []
) => {
    const {
        deployments: { deploy, get, getOrNull, log, save: deploymentsSave },
        ethers,
    } = hre;

    const proxyDeployedName = logicName + "_Proxy";
    const logicDeployedName = logicName + "_Implementation";

    let proxyDeployment = await getOrNull(proxyDeployedName);
    let isNewProxy = false;
    if (!proxyDeployment) {
        await deploy(proxyDeployedName, {
            contract: proxyName,
            from: deployer,
            args: proxyArgs,
            log: true,
        });
        isNewProxy = true;
    }

    const tx = await deploy(logicDeployedName, {
        contract: logicName,
        from: deployer,
        args: args,
        log: true,
    });

    const proxy = await ethers.getContract(proxyDeployedName);
    const prevImpl = await proxy.getImplementation();
    log(`Current ${logicDeployedName}: ${prevImpl}`);

    if (tx.newlyDeployed || tx.address != prevImpl) {
        log(`New ${logicDeployedName}: ${tx.address}`);
        if (!tx.newlyDeployed) {
            logger.information(
                `${logicDeployedName} is not re-deployed but not upgraded yet in the proxy`
            );
        }
        const proxyDeployment = await get(proxyDeployedName);
        await deploymentsSave(logicName, {
            abi: tx.abi,
            address: proxy.address, // used to override receipt.contractAddress (useful for proxies)
            receipt: tx.receipt,
            bytecode: tx.bytecode,
            deployedBytecode: tx.deployedBytecode,
            implementation: tx.address,
        });
        if ((hre.network.tags["testnet"] || isOwnerMultisig) && !isNewProxy) {
            //multisig is the owner
            const multisigDeployment = await get(multisigName);
            //@todo wrap getting ms tx data into a helper
            let proxyInterface = new ethers.utils.Interface(proxyDeployment.abi);
            let data = proxyInterface.encodeFunctionData("setImplementation", [tx.address]);
            log(
                `Creating multisig tx to set ${logicDeployedName} (${tx.address}) as implementation for ${logicDeployedName} (${proxyDeployment.address}...`
            );
            log();
            await sendWithMultisig(hre, multisigDeployment.address, proxy.address, data, deployer);
            log(
                `>>> DONE. Requires Multisig (${multisigDeployment.address}) signing to execute tx <<<
                 >>> DON'T PUSH/MERGE ${logicName} TO THE DEVELOPMENT BRANCH REPO UNTIL THE MULTISIG TX SUCCESSFULLY SIGNED & EXECUTED <<<`
            );
        } else if (hre.network.tags["mainnet"] && !isNewProxy) {
            // log(">>> Create a Bitocracy proposal via a SIP <<<");
            logger.information(">>> Create a Bitocracy proposal via a SIP <<<");
            logger.information(
                `>>> DON'T MERGE ${logicName} TO THE MAIN BRANCH UNTIL THE SIP IS SUCCESSFULLY EXECUTED <<<`
            );
            // governance is the owner - need a SIP to register
            // alternatively can use brownie sip_interaction scripts to create proposal
        } else {
            await proxy.setImplementation(tx.address);
            logger.information(
                `>>> New implementation ${await proxy.getImplementation()} is set to the proxy <<<`
            );
        }
        if (ethers.utils.isAddress(proxyOwner) && (await proxy.getOwner()) !== proxyOwner) {
            await proxy.transferOwnership(proxyOwner);
            logger.success(
                `Proxy ${proxyDeployedName} ownership transferred to ${await proxy.getOwner()}`
            );
        }
        log();
    }
};
const getImpersonatedSignerFromJsonRpcProvider = async (hre, addressToImpersonate) => {
    const { ethers } = hre;
    const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
    await provider.send("hardhat_impersonateAccount", [addressToImpersonate]);
    return provider.getSigner(addressToImpersonate);
};

export {
    getTxLog,
    parseEthersLog,
    parseEthersLogToValue,
    getEthersLog,
    getParsedEventLogFromReceipt,
    sendWithMultisig,
    signWithMultisig,
    multisigExecuteTx,
    multisigCheckTx,
    multisigAddOwner,
    multisigRemoveOwner,
    multisigRevokeConfirmation,
    isMultisigOwner,
    createProposal,
    defaultValueMultisigOrSipFlag,
    deployWithCustomProxy,
    getImpersonatedSignerFromJsonRpcProvider,
};
