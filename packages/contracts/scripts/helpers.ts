/* eslint-disable no-plusplus */
import { Interface } from "@ethersproject/abi/lib/interface";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    BigNumberish,
    BytesLike,
    Contract,
    Signer,
    TransactionReceipt,
    TransactionResponse,
} from "ethers";
import { Address } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { GovernorAlpha, MultiSigWallet } from "types/generated";
import Logs from "node-logs";
const logger = new Logs().showInConsole(true);

let hre: HardhatRuntimeEnvironment;
let ethers: HardhatRuntimeEnvironment["ethers"];

// @dev run this function to initialize hre
const injectHre = (_hre: HardhatRuntimeEnvironment) => {
    hre = _hre;
    ethers = hre.ethers;
};

const sendWithMultisig = async (
    multisigAddress: Address,
    contractAddress: Address,
    data: BytesLike,
    sender: Address,
    value = 0
) => {
    const multisig = await ethers.getContractAt("MultiSigWallet", multisigAddress);
    const signer = await ethers.getSigner(sender);
    const receipt = await (
        await multisig.connect(signer).submitTransaction(contractAddress, value, data)
    ).wait();

    const abi = ["event Submission(uint256 indexed transactionId)"];
    const iface = new ethers.utils.Interface(abi);
    const parsedEvent = await getParsedEventLogFromReceipt(receipt, iface, "Submission");
    await multisigCheckTx(parsedEvent.transactionId.value.toNumber(), multisig.address);
};

const signWithMultisig = async (multisigAddress, txId, sender) => {
    console.log("Signing multisig txId:", txId);
    const multisig = await ethers.getContractAt("MultiSigWallet", multisigAddress);
    const signer = await ethers.getSigner(sender);
    await (await multisig.connect(signer).confirmTransaction(txId)).wait();
    // console.log("Required signatures:", await multisig.required());
    console.log("Signed. Details:");
    await multisigCheckTx(txId, multisig.address);
};

const multisigCheckTx = async (txId, multisigAddress = ethers.constants.AddressZero) => {
    const {
        deployments: { get },
    } = hre;
    const multisig = await ethers.getContractAt(
        "MultiSigWallet",
        multisigAddress === ethers.constants.AddressZero
            ? (
                  await get("MultiSigWallet")
              ).address
            : multisigAddress
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
    events.forEach((event) => {
        const ethersParsed = contract.interface.parseLog(event);
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
    governorAddress,
    targets,
    values,
    signatures,
    callDatas,
    description,
    signer
) => {
    // governorDeployment = (await get("GovernorAlpha")).address;
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
    deployer,
    logicArtifactName, //logic contract artifact name
    proxyArtifactName, // proxy deployment name
    logicInstanceName = undefined, // save logic implementation as
    proxyInstanceName = undefined, // save proxy implementation as
    isOwnerMultisig = false, // overrides network dependency
    args: any = [],
    proxyArgs: any[] = [],
    multisigName = "MultiSigWallet",
    proxyOwner = "" // new proxy owner address, used for new proxy deployments and only if there are no post-deployment func calls from the creator address
) => {
    const {
        deployments: { deploy, get, getOrNull, log, save },
        ethers,
    } = hre;

    proxyInstanceName = proxyInstanceName == "" ? undefined : proxyInstanceName;
    logicInstanceName = logicInstanceName == "" ? undefined : logicInstanceName;

    const proxyName = proxyInstanceName ?? proxyArtifactName; // support multiple deployments of the same artifact
    let proxyDeployment = await getOrNull(proxyName);
    let isNewProxy = false;
    if (!proxyDeployment) {
        await deploy(proxyName, {
            contract: proxyArtifactName,
            from: deployer,
            args: proxyArgs,
            log: true,
        });
        isNewProxy = true;
    }

    const logicName = logicInstanceName ?? logicArtifactName;
    const logicImplName = logicName + "_Implementation"; // naming convention like in hh deployment
    const logicDeploymentTx = await deploy(logicImplName, {
        contract: logicArtifactName,
        from: deployer,
        args: args,
        log: true,
    });

    const proxy = await ethers.getContract(proxyName);
    const prevImpl = await proxy.getImplementation();
    log(`Current ${proxyName} implementation: ${prevImpl}`);

    if (logicDeploymentTx.newlyDeployed || logicDeploymentTx.address != prevImpl) {
        log(`New ${proxyName} implementation: ${logicImplName} @ ${logicDeploymentTx.address}`);
        await save(logicName, {
            address: proxy.address,
            implementation: logicDeploymentTx.address,
            abi: logicDeploymentTx.abi,
            bytecode: logicDeploymentTx.bytecode,
            deployedBytecode: logicDeploymentTx.deployedBytecode,
            devdoc: logicDeploymentTx.devdoc,
            userdoc: logicDeploymentTx.userdoc,
            storageLayout: logicDeploymentTx.storageLayout,
        });

        const proxyDeployment = await get(proxyName);
        if ((hre.network.tags["testnet"] || isOwnerMultisig) && !isNewProxy) {
            //multisig is the owner
            const multisigDeployment = await get(multisigName);
            //@todo wrap getting ms tx data into a helper
            let proxyInterface = new ethers.utils.Interface(proxyDeployment.abi);
            let data = proxyInterface.encodeFunctionData("setImplementation", [
                logicDeploymentTx.address,
            ]);
            logger.warn(
                `Creating multisig tx to set ${logicArtifactName} (${logicDeploymentTx.address}) as implementation for ${proxyName} (${proxyDeployment.address}...`
            );
            log();
            await sendWithMultisig(multisigDeployment.address, proxy.address, data, deployer);
            logger.info(
                `>>> DONE. Requires Multisig (${multisigDeployment.address}) signing to execute tx <<<
                 >>> DON'T PUSH DEPLOYMENTS TO THE REPO UNTIL THE MULTISIG TX SUCCESSFULLY SIGNED & EXECUTED <<<`
            );
        } else if (hre.network.tags["mainnet"] && !isNewProxy) {
            logger.warn(">>> Create a Bitocracy proposal via SIP <<<");
            logger.error(
                ">>> DON'T PUSH DEPLOYMENTS TO THE REPO UNTIL THE SIP IS SUCCESSFULLY EXECUTED <<<`"
            );
            // governance is the owner - need a SIP to register
            // TODO: implementation ; meanwhile use brownie sip_interaction scripts to create proposal
        } else {
            const proxy = await ethers.getContractAt(proxyName, proxyDeployment.address);
            await proxy.setImplementation(logicDeploymentTx.address);
            log(
                `>>> New implementation ${await proxy.getImplementation()} is set to the proxy <<<`
            );
        }
        if (ethers.utils.isAddress(proxyOwner) && (await proxy.getOwner()) !== proxyOwner) {
            await proxy.transferOwnership(proxyOwner);
            logger.success(
                `Proxy ${proxyName} ownership transferred to ${await proxy.getOwner()}`
            );
        }
        log();
    }
};

export {
    parseEthersLog,
    getEthersLog,
    getParsedEventLogFromReceipt,
    sendWithMultisig,
    signWithMultisig,
    multisigCheckTx,
    createProposal,
    injectHre,
    defaultValueMultisigOrSipFlag,
    deployWithCustomProxy,
};
