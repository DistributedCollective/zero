import { ParamType } from "@ethersproject/abi";
import { Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import Logs from "node-logs";
import { LiquityBaseParams, TroveManager } from "types/generated";
import { LiquityBaseInterface } from "types/generated/artifacts/contracts/Dependencies/LiquityBase";
const logger = new Logs().showInConsole(true);

export interface ISipArgument {
    targets: string[];
    values: number[];
    signatures: string[];
    data: string[];
    description: string;
}

const sampleSIP01 = async (hre: HardhatRuntimeEnvironment): Promise<ISipArgument> => {
    const { ethers } = hre;
    const SampleToken = await ethers.getContractFactory("ERC20");
    const args: ISipArgument = {
        targets: ["0x95a1CA72Df913f14Dc554a5D14E826B64Bd049FD"],
        values: [0],
        signatures: ["transfer(address,uint256)"],
        data: [
            SampleToken.interface.encodeFunctionData("transfer", [
                "0x95222290dd7278aa3ddd389cc1e1d165cc4bafe5",
                ethers.utils.parseEther("1"),
            ]),
        ],
        description: "SIP-0001: Transfer token. SHA256: ",
    };

    return args;
};

const zeroMyntIntegrationSIP = async (hre: HardhatRuntimeEnvironment): Promise<ISipArgument> => {
    const {
        ethers,
        deployments: { get },
    } = hre;

    const targetContractsList = [
        "BorrowerOperations",
        "StabilityPool",
        "ZUSDToken",
        "TroveManager",
    ];
    const targetsContractProxies = await Promise.all(
        targetContractsList.map(async (val) => {
            return (await get(val)).address;
        })
    );

    const contractsImplementations = await Promise.all(
        targetContractsList.map(async (val) => {
            return (await get(val + "_Implementation")).address;
        })
    );

    const getImplementationAbi = ["function getImplementation() public view returns(address)"];
    // const getImplementationInterface = new ethers.utils.Interface(getImplementationAbi);
    // validate deployments
    const errorLog: string[] = [];
    await Promise.all(
        targetsContractProxies.map(async (val, index) => {
            const proxy = await ethers.getContractAt(getImplementationAbi, val);
            if ((await proxy.getImplementation()) === contractsImplementations[index]) {
                errorLog.push(
                    `Implementation ${targetContractsList[index]} has not changed: ${contractsImplementations[index]}`
                );
            }
        })
    );
    if (errorLog.length > 0) {
        logger.error(errorLog);
        //throw Error();
    }

    const iSetImplementationInterface = new ethers.utils.Interface([
        "function setImplementation(address _implementation)",
    ]);
    /*
    const encodeParameters = (types, values) => {
        const abi = new ethers.utils.AbiCoder();
        return abi.encode(types, values);
    };*/

    const datas = targetsContractProxies.map((val, index) => {
        return iSetImplementationInterface._abiCoder.encode(
            ["address"],
            [contractsImplementations[index]]
        );
        //return encodeParameters(["address"], [contractsImplementations[index]]);
    });
    const signatures = Array(targetsContractProxies.length).fill("setImplementation(address)");

    // replace troveManagerRedeepOps in TroveManager
    const iSetTroveManagerRedeemOps = new ethers.utils.Interface([
        "function setTroveManagerRedeemOps(address _troveManagerRedeemOps)",
    ]);

    signatures.push("setTroveManagerRedeemOps(address)");
    const troveManagerDeployment = await get("TroveManager");
    const troveManagerRedeemOpsDeployment = await get("TroveManagerRedeemOps");
    targetsContractProxies.push(troveManagerDeployment.address);
    datas.push(
        iSetTroveManagerRedeemOps._abiCoder.encode(
            ["address"],
            [troveManagerRedeemOpsDeployment.address]
        )
    );

    // validate TroveManagerRedeemOps
    const troveManager = (await ethers.getContract("TroveManager")) as unknown as TroveManager;
    if ((await troveManager.troveManagerRedeemOps()) === troveManagerRedeemOpsDeployment.address) {
        logger.error(
            `TroveManagerRedeemOps is not changed: ${troveManagerRedeemOpsDeployment.address}. Either deployment address is wrong or should be excluded from the SIP.`
        );
        throw Error();
    }

    // set MassetManager in BorrowerOperations
    const iSetMassetManagerAddress = new ethers.utils.Interface([
        "function setMassetManagerAddress(address _massetManagerAddress)",
    ]);
    signatures.push("setMassetManagerAddress(address)");
    const borrowerOperations = await ethers.getContract("BorrowerOperations");
    targetsContractProxies.push(borrowerOperations.address);
    const massetManagerDeployment = await get("MassetManager");
    datas.push(
        iSetMassetManagerAddress._abiCoder.encode(["address"], [massetManagerDeployment.address])
    );

    /*
    there is no IMassetManager yet
    if (
        ethers.utils.getAddress(await borrowerOperations.massetManager()) ===
        massetManagerDeployment.address
    ) {
        logger.error(
            `MassetManager is not changed: ${troveManagerRedeemOpsDeployment.address}. Either deployment address is wrong or should be excluded from the SIP.`
        );
        throw Error();
    }*/

    const args: ISipArgument = {
        targets: targetsContractProxies,
        values: Array(targetsContractProxies.length).fill(0),
        signatures: signatures,
        data: datas,
        description:
            "SIP-0054: Integrate Mynt with Zero, Details: https://github.com/DistributedCollective/SIPS/blob/98ef848/SIP-0054.md, sha256: f623ab973a6fa175cc2bd1ebc50cf79699de2f88b84d98535288dba150a4ff4b",
    };

    return args;
};

const zeroFeesUpdate = async (hre: HardhatRuntimeEnvironment): Promise<ISipArgument> => {
    const {
        ethers,
        deployments: { get },
    } = hre;
    const zeroBaseParams = await get("LiquityBaseParams");
    const newFeeValue = ethers.utils.parseEther("0.025");
    console.log(newFeeValue.toString());
    const iSetFeesFloor = new ethers.utils.Interface([
        "function setBorrowingFeeFloor(uint256)",
        "function setRedemptionFeeFloor(uint256)",
    ]);
    const args: ISipArgument = {
        targets: [zeroBaseParams.address, zeroBaseParams.address],
        values: [0, 0],
        signatures: ["setBorrowingFeeFloor(uint256)", "setRedemptionFeeFloor(uint256)"],
        data: [
            iSetFeesFloor._abiCoder.encode(["uint256"], [newFeeValue]),
            iSetFeesFloor._abiCoder.encode(["uint256"], [newFeeValue]),
        ],
        description:
            "SIP-0055: Zero Fee Floor Update, Details: https://github.com/DistributedCollective/SIPS/blob/b7efe43/SIP-0055.md, sha256: 0f193ed8589e8ef0e8db3b66ef2c23a6b139245d3a9335b67851421cbd73d53c",
    };

    return args;
};

const SIPArgs = {
    zeroMyntIntegrationSIP,
    zeroFeesUpdate,
};

export default SIPArgs;
