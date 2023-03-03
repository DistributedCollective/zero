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

    const datas = targetsContractProxies.map((val, index) => {
        return iSetImplementationInterface.encodeFunctionData("setImplementation", [
            contractsImplementations[index],
        ]);
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
        iSetTroveManagerRedeemOps.encodeFunctionData("setTroveManagerRedeemOps", [
            troveManagerRedeemOpsDeployment.address,
        ])
    );

    // validate TroveManagerRedeemOps
    const troveManager = (await ethers.getContract("TroveManager")) as unknown as TroveManager;
    if ((await troveManager.troveManagerRedeemOps()) === troveManagerRedeemOpsDeployment.address) {
        logger.error(
            `TroveManagerRedeemOps has not changed: ${troveManagerRedeemOpsDeployment.address}`
        );
        //throw Error();
    }

    const args: ISipArgument = {
        targets: targetsContractProxies,
        values: Array(targetsContractProxies.length).fill(0),
        signatures: signatures,
        data: datas,
        description:
            "SIP-0054: Integrate Mynt with Zero, Details: https://github.com/DistributedCollective/SIPS/blob/8e000bb/SIP-0054.md, sha256: 2fb11199c6e6314760d88f55dc41df159367053f7f32c4b3897028c72a562b63",
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
    const iSetFeesFloor = new ethers.utils.Interface([
        "function setBorrowingFeeFloor(uint256)",
        "function setRedemptionFeeFloor(uint256)",
    ]);
    const args: ISipArgument = {
        targets: [zeroBaseParams.address, zeroBaseParams.address],
        values: [0, 0],
        signatures: ["setBorrowingFeeFloor(uint256)", "setRedemptionFeeFloor(uint256)"],
        data: [
            iSetFeesFloor.encodeFunctionData("setBorrowingFeeFloor", [newFeeValue.toString()]),
            iSetFeesFloor.encodeFunctionData("setRedemptionFeeFloor", [newFeeValue.toString()]),
        ],
        description:
            "SIP-0055: Zero Fee Floor Update, Details: https://github.com/DistributedCollective/SIPS/blob/d47da5f/SIP-0055.md, sha256: b9967c703b6ef102067a9d170940f46d414d7f9dd259d606ecedca8bd14ebfdf",
    };

    return args;
};

const SIPArgs = {
    sampleSIP01,
    zeroMyntIntegrationSIP,
    zeroFeesUpdate,
};

export default SIPArgs;
