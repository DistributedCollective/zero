import { HardhatNetworkAccountsUserConfig, HardhatUserConfig } from "hardhat/types";
import { task, /*HardhatUserConfig,*/ types, extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";

import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

import "hardhat-gas-reporter";
import "solidity-coverage";
import "@nomiclabs/hardhat-web3";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-truffle5";

import "hardhat-deploy";
// import "tsconfig-paths/register";
import "@typechain/hardhat";
/// import "hardhat-docgen";
import "hardhat-contract-sizer";
/// import "@openzeppelin/hardhat-upgrades";

// import "tasks/contractsInteraction";
// import "tasks/metaAssetTokenInteraction";
// import "tasks/upgradeContract";
// import "tasks/transferOwnership";
// import "tasks/sips/createSIP";

import * as dotenv from "dotenv";
// import "@nomicfoundation/hardhat-chai-matchers";
// import "@tenderly/hardhat-tenderly";
import "tsconfig-paths/register";
import "@typechain/hardhat";
/// import "hardhat-docgen";
/// import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-solhint";

// import "tasks/contractsInteraction";

import "@typechain/ethers-v5";
import "@nomiclabs/hardhat-etherscan";
import "solidity-coverage";
import "@primitivefi/hardhat-dodoc";

import "./tasks/sips/createSIP";

const accounts =
    process.env.ACC_QTY === "20"
        ? require("./hardhatAccountsList20.js")
        : require("./hardhatAccountsList2k.js");
const accountsList: HardhatNetworkAccountsUserConfig = accounts.accountsList;
import fs from "fs";
const getSecret = (secretKey: string, defaultValue = "") => {
    const SECRETS_FILE = "./secrets.js";
    let secret = defaultValue;
    if (fs.existsSync(SECRETS_FILE)) {
        const { secrets } = require(SECRETS_FILE);
        if (secrets[secretKey]) {
            secret = secrets[secretKey];
        }
    }

    return secret;
};
const alchemyUrl = () => {
    return `https://eth-mainnet.alchemyapi.io/v2/${getSecret("alchemyAPIKey")}`;
};

const alchemyUrlRinkeby = () => {
    return `https://eth-rinkeby.alchemyapi.io/v2/${getSecret("alchemyAPIKeyRinkeby")}`;
};

const mnemonic = {
    mnemonic: "buzz buzz buzz buzz buzz buzz buzz buzz buzz buzz buzz word",
};
dotenv.config();
const testnetPKs = [
    process.env.TESTNET_DEPLOYER_PRIVATE_KEY ?? "",
    process.env.TESTNET_SIGNER_PRIVATE_KEY ?? "",
].filter((item, i, arr) => item !== "" && arr.indexOf(item) === i);

const testnetAccounts = testnetPKs.length > 0 ? testnetPKs : mnemonic;
const mainnetAccounts = process.env.MAINNET_DEPLOYER_PRIVATE_KEY
    ? [process.env.MAINNET_DEPLOYER_PRIVATE_KEY]
    : mnemonic;

task("check-fork-patch", "Check Hardhat Fork Patch by Rainer").setAction(async (taskArgs, hre) => {
    await hre.network.provider.request({
        method: "hardhat_reset",
        params: [
            {
                forking: {
                    jsonRpcUrl: "https://mainnet-dev.sovryn.app/rpc",
                    blockNumber: 4272658,
                },
            },
        ],
    });
    //const xusd = await IERC20.at("0xb5999795BE0EbB5bAb23144AA5FD6A02D080299F");
    const xusd = await hre.ethers.getContractAt(
        "ERC20",
        "0xb5999795BE0EbB5bAb23144AA5FD6A02D080299F"
    );
    const totalSupply = await xusd.totalSupply();
    if (totalSupply.toString() === "12346114443582774719512874")
        console.log("Hardhat mainnet forking works properly!");
    else console.log("Hardhat mainnet forking does NOT work properly!");
});

const config: HardhatUserConfig = {
    solidity: {
        compilers: [
            {
                version: "0.4.23",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
            {
                version: "0.5.17",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
            {
                version: "0.6.11",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
        ],
    },
    paths: {
        sources: "./contracts",
        tests: "./tests",
        deploy: "./deployment/deploy",
        deployments: "./deployment/deployments",
    },
    namedAccounts: {
        deployer: {
            default: 0,
        },
        signer: {
            default: 1,
        },
    },
    networks: {
        hardhat: {
            accounts: accountsList,
            allowUnlimitedContractSize: true,
            //gasPrice: 66000000, // setting the gasPrice and blockGasLimit breaks some gas estimation tests
            //blockGasLimit: 6800000,
            initialBaseFeePerGas: 0,
        },
        /*localhost: {
            url: "http://127.0.0.1:8545/",
            allowUnlimitedContractSize: true,
            initialBaseFeePerGas: 0,
        },*/
        mainnet: {
            url: alchemyUrl(),
            gasPrice: 150000000000,
            accounts: [
                getSecret(
                    "DEPLOYER_PRIVATEKEY",
                    "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
                ),
                getSecret(
                    "ACCOUNT2_PRIVATEKEY",
                    "0x3ec7cedbafd0cb9ec05bf9f7ccfa1e8b42b3e3a02c75addfccbfeb328d1b383b"
                ),
            ],
        },
        rinkeby: {
            url: alchemyUrlRinkeby(),
            gas: 10000000, // tx gas limit
            accounts: [
                getSecret(
                    "RINKEBY_DEPLOYER_PRIVATEKEY",
                    "0x60ddfe7f579ab6867cbe7a2dc03853dc141d7a4ab6dbefc0dae2d2b1bd4e487f"
                ),
            ],
        },
        rskdev: {
            url: "http://localhost:4444",
            // regtest default prefunded account
            from: "0xcd2a3d9f938e13cd947ec05abc7fe734df8dd826",
        },
        /// TESTNETS
        rskSovrynTestnet: {
            url: "https://testnet.sovryn.app/rpc",
            accounts: testnetAccounts,
            chainId: 31,
            gasMultiplier: 1.25,
            tags: ["testnet"],
            timeout: 100000,
            //timeout: 20000, // increase if needed; 20000 is the default value
            //allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
        },
        rskForkedTestnet: {
            // e.g. hh node --fork https://testnet.sovryn.app/rpc --no-deploy --gasprice 66000000 --fork-block-number 5018378
            chainId: 31337,
            accounts: testnetAccounts,
            url: "http://127.0.0.1:8545/",
            gas: 6800000,
            live: true,
            tags: ["testnet", "forked"],
            timeout: 100000,
        },
        rskTestnet: {
            url: "https://public-node.testnet.rsk.co/",
            accounts: testnetAccounts,
            chainId: 31,
            gasMultiplier: 1.25,
            tags: ["testnet"],
            timeout: 100000,
            //timeout: 20000, // increase if needed; 20000 is the default value
            //allowUnlimitedContractSize, //EIP170 contrtact size restriction temporal testnet workaround
        },

        /// MAINNETS
        rskSovrynMainnet: {
            url: "https://mainnet-dev.sovryn.app/rpc",
            chainId: 30,
            accounts: mainnetAccounts,
            tags: ["mainnet"],
            timeout: 100000,
            //timeout: 20000, // increase if needed; 20000 is the default value
        },
        rskForkedMainnet: {
            // npx hardhat node --fork https://mainnet-dev.sovryn.app/rpc --no-deploy --fork-block-number 5018378 --gasprice 66000000
            chainId: 31337,
            accounts: mainnetAccounts,
            url: "http://127.0.0.1:8545",
            gasPrice: 66000000,
            blockGasLimit: 6800000,
            live: true,
            tags: ["mainnet", "forked"],
            timeout: 100000,
        },
        rskMainnet: {
            url: "https://public-node.rsk.co/",
            chainId: 30,
            accounts: mainnetAccounts,
            tags: ["mainnet"],
            //timeout: 20000, // increase if needed; 20000 is the default value
            timeout: 100000,
        },
        rskForkedTestnetFlashback: {
            chainId: 31337,
            accounts: testnetAccounts,
            url: "http://127.0.0.1:8545/",
            blockGasLimit: 6800000,
            live: true,
            tags: ["testnet", "forked"],
            timeout: 100000,
        },
        rskForkedMainnetFlashback: {
            chainId: 31337,
            accounts: mainnetAccounts,
            url: "http://127.0.0.1:8545",
            blockGasLimit: 6800000,
            live: true,
            tags: ["mainnet", "forked"],
            timeout: 100000,
        },
    },
    mocha: { timeout: 12000000 },
    /*rpc: {
        host: "localhost",
        port: 8545
    },*/
    gasReporter: {
        enabled: process.env.REPORT_GAS ? true : false,
    },
    dodoc: {
        runOnCompile: false, // if false then run `npx hardhat dodoc` in console to generate docs
        include: ["contracts"], // [] == everything; input paths to limit dics to the domain contracts only
        exclude: [
            "contracts/.vscode",
            "contracts/artifacts",
            "contracts/TestContracts",
            "contracts/ZERO",
            "contracts/Proxy/ZEROStakingScript.sol",
            "contracts/Interfaces/ICommunityIssuance.sol",
        ], // [] == everything; input paths to limit dics to the domain contracts only
        outputDir: "docs",
        keepFileStructure: false,
        freshOutput: true,
    },
    typechain: {
        outDir: "types/generated",
        target: "ethers-v5",
        externalArtifacts: ["external/artifacts/*.sol/!(*.dbg.json)"], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    },
    external: {
        contracts: [
            {
                artifacts: "external/artifacts/*.sol/!(*.dbg.json)",
                // deploy: "node_modules/@cartesi/arbitration/export/deploy",
            },
            /* {
        artifacts: "node_modules/someotherpackage/artifacts",
      }, */
        ],
        deployments: {
            rskSovrynTestnet: ["external/deployments/rskTestnet"],
            rskTestnet: [
                "external/deployments/rskTestnet",
                "deployment/deployments/rskSovrynTestnet",
            ],
            rskForkedTestnet: [
                "external/deployments/rskTestnet",
                "deployment/deployments/rskSovrynTestnet",
            ],
            rskMainnet: [
                "external/deployments/rskMainnet",
                "deployment/deployments/rskSovrynMainnet",
            ],
            rskSovrynMainnet: ["external/deployments/rskMainnet"],
            rskForkedMainnet: [
                "external/deployments/rskMainnet",
                "deployment/deployments/rskSovrynMainnet",
            ],
            rskForkedTestnetFlashback: ["external/deployments/rskForkedTestnetFlashback"],
            rskForkedMainnetFlashback: ["external/deployments/rskForkedMainnetFlashback"],
        },
    },
};

export default config;
