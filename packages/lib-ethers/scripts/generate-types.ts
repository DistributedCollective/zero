import fs from "fs-extra";
import path from "path";

import { Interface, ParamType } from "@ethersproject/abi";

import ActivePool from "@sovryn-zero/contracts/artifacts/contracts/ActivePool.sol/ActivePool.json"
import BorrowerOperations from "@sovryn-zero/contracts/artifacts/contracts/BorrowerOperations.sol/BorrowerOperations.json";
import CollSurplusPool from "@sovryn-zero/contracts/artifacts/contracts/CollSurplusPool.sol/CollSurplusPool.json";
import CommunityIssuance from "@sovryn-zero/contracts/artifacts/contracts/ZERO/CommunityIssuance.sol/CommunityIssuance.json";
import DefaultPool from "@sovryn-zero/contracts/artifacts/contracts/DefaultPool.sol/DefaultPool.json";
import GasPool from "@sovryn-zero/contracts/artifacts/contracts/GasPool.sol/GasPool.json";
import HintHelpers from "@sovryn-zero/contracts/artifacts/contracts/HintHelpers.sol/HintHelpers.json";
import IERC20 from "@sovryn-zero/contracts/artifacts/contracts/Dependencies/IERC20.sol/IERC20.json";
import ZUSDToken from "@sovryn-zero/contracts/artifacts/contracts/ZUSDToken.sol/ZUSDToken.json";
import ZEROStaking from "@sovryn-zero/contracts/artifacts/contracts/ZERO/ZEROStaking.sol/ZEROStaking.json";
import ZEROToken from "@sovryn-zero/contracts/artifacts/contracts/ZERO/ZEROToken.sol/ZEROToken.json";
import MultiTroveGetter from "@sovryn-zero/contracts/artifacts/contracts/MultiTroveGetter.sol/MultiTroveGetter.json";
import PriceFeed from "@sovryn-zero/contracts/artifacts/contracts/PriceFeed.sol/PriceFeed.json";
import PriceFeedTestnet from "@sovryn-zero/contracts/artifacts/contracts/TestContracts/PriceFeedTestnet.sol/PriceFeedTestnet.json";
import SortedTroves from "@sovryn-zero/contracts/artifacts/contracts/SortedTroves.sol/SortedTroves.json";
import StabilityPool from "@sovryn-zero/contracts/artifacts/contracts/StabilityPool.sol/StabilityPool.json";
import TroveManager from "@sovryn-zero/contracts/artifacts/contracts/TroveManager.sol/TroveManager.json";
import UpgradeableProxy from "@sovryn-zero/contracts/artifacts/contracts/Proxy/UpgradableProxy.sol/UpgradableProxy.json";
import LiquityBaseParams from "@sovryn-zero/contracts/artifacts/contracts/LiquityBaseParams.sol/LiquityBaseParams.json";
import TroveManagerRedeemOps from "@sovryn-zero/contracts/artifacts/contracts/Dependencies/TroveManagerRedeemOps.sol/TroveManagerRedeemOps.json";
import MockBalanceRedirectPresale from "@sovryn-zero/contracts/artifacts/contracts/TestContracts/MockFeeSharingCollector.sol/MockFeeSharingCollector.json";
import FeeDistributor from "@sovryn-zero/contracts/artifacts/contracts/FeeDistributor.sol/FeeDistributor.json";
import Ownable from "@sovryn-zero/contracts/artifacts/contracts/Dependencies/Ownable.sol/Ownable.json";

const getTupleType = (components: ParamType[], flexible: boolean) => {
  if (components.every(component => component.name)) {
    return (
      "{ " +
      components.map(component => `${component.name}: ${getType(component, flexible)}`).join("; ") +
      " }"
    );
  } else {
    return `[${components.map(component => getType(component, flexible)).join(", ")}]`;
  }
};

const getType = ({ baseType, components, arrayChildren }: ParamType, flexible: boolean): string => {
  switch (baseType) {
    case "address":
    case "string":
      return "string";

    case "bool":
      return "boolean";

    case "array":
      return `${getType(arrayChildren, flexible)}[]`;

    case "tuple":
      return getTupleType(components, flexible);
  }

  if (baseType.startsWith("bytes")) {
    return flexible ? "BytesLike" : "string";
  }

  const match = baseType.match(/^(u?int)([0-9]+)$/);
  if (match) {
    return flexible ? "BigNumberish" : parseInt(match[2]) >= 53 ? "BigNumber" : "number";
  }

  throw new Error(`unimplemented type ${baseType}`);
};

const declareInterface = ({
  contractName,
  interface: { events, functions }
}: {
  contractName: string;
  interface: Interface;
}) =>
  [
    `interface ${contractName}Calls {`,
    ...Object.values(functions)
      .filter(({ constant }) => constant)
      .map(({ name, inputs, outputs }) => {
        const params = [
          ...inputs.map((input, i) => `${input.name || "arg" + i}: ${getType(input, true)}`),
          `_overrides?: CallOverrides`
        ];

        let returnType: string;
        if (!outputs || outputs.length == 0) {
          returnType = "void";
        } else if (outputs.length === 1) {
          returnType = getType(outputs[0], false);
        } else {
          returnType = getTupleType(outputs, false);
        }

        return `  ${name}(${params.join(", ")}): Promise<${returnType}>;`;
      }),
    "}\n",

    `interface ${contractName}Transactions {`,
    ...Object.values(functions)
      .filter(({ constant }) => !constant)
      .map(({ name, payable, inputs, outputs }) => {
        const overridesType = payable ? "PayableOverrides" : "Overrides";

        const params = [
          ...inputs.map((input, i) => `${input.name || "arg" + i}: ${getType(input, true)}`),
          `_overrides?: ${overridesType}`
        ];

        let returnType: string;
        if (!outputs || outputs.length == 0) {
          returnType = "void";
        } else if (outputs.length === 1) {
          returnType = getType(outputs[0], false);
        } else {
          returnType = getTupleType(outputs, false);
        }

        return `  ${name}(${params.join(", ")}): Promise<${returnType}>;`;
      }),
    "}\n",

    `export interface ${contractName}`,
    `  extends _TypedLiquityContract<${contractName}Calls, ${contractName}Transactions> {`,
    "  readonly address: string;",
    "  readonly filters: {",
    ...Object.values(events).map(({ name, inputs }) => {
      const params = inputs.map(
        input => `${input.name}?: ${input.indexed ? `${getType(input, true)} | null` : "null"}`
      );

      return `    ${name}(${params.join(", ")}): EventFilter;`;
    }),
    "  };",

    ...Object.values(events).map(
      ({ name, inputs }) =>
        `  extractEvents(logs: Log[], name: "${name}"): _TypedLogDescription<${getTupleType(
          inputs,
          false
        )}>[];`
    ),

    "}"
  ].join("\n");

const contractArtifacts = [
  ActivePool,
  BorrowerOperations,
  CollSurplusPool,
  CommunityIssuance,
  DefaultPool,
  GasPool,
  HintHelpers,
  IERC20,
  ZUSDToken,
  ZEROStaking,
  ZEROToken,
  MultiTroveGetter,
  PriceFeed,
  PriceFeedTestnet,
  SortedTroves,
  StabilityPool,
  TroveManager,
  TroveManagerRedeemOps,
  UpgradeableProxy,
  LiquityBaseParams,
  MockBalanceRedirectPresale,
  FeeDistributor,
  Ownable
];

const contracts = contractArtifacts.map(({ contractName, abi }) => ({
  contractName,
  interface: new Interface(abi)
}));

const output = `
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import { Log } from "@ethersproject/abstract-provider";
import { BytesLike } from "@ethersproject/bytes";
import {
  Overrides,
  CallOverrides,
  PayableOverrides,
  EventFilter
} from "@ethersproject/contracts";

import { _TypedLiquityContract, _TypedLogDescription } from "../src/contracts";

${contracts.map(declareInterface).join("\n\n")}
`;

fs.mkdirSync("types", { recursive: true });
fs.writeFileSync(path.join("types", "index.ts"), output);

