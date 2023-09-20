import fs from "fs-extra";
import path from "path";

import { Interface, ParamType } from "@ethersproject/abi";

import ActivePool from "../../contracts/deployment/deployments/rskSovrynMainnet/ActivePool.json";
import BorrowerOperations from "../../contracts/deployment/deployments/rskSovrynMainnet/BorrowerOperations.json";
import CollSurplusPool from "../../contracts/deployment/deployments/rskSovrynMainnet/CollSurplusPool.json";
import CommunityIssuance from "../../contracts/deployment/deployments/rskSovrynMainnet/CommunityIssuance.json";
import DefaultPool from "../../contracts/deployment/deployments/rskSovrynMainnet/DefaultPool.json";
import GasPool from "../../contracts/deployment/deployments/rskSovrynMainnet/GasPool.json";
import HintHelpers from "../../contracts/deployment/deployments/rskSovrynMainnet/HintHelpers.json";
import IERC20 from "../../contracts/artifacts/contracts/Dependencies/IERC20.sol/IERC20.json";
import ZUSDToken from "../../contracts/deployment/deployments/rskSovrynMainnet/ZUSDToken.json";
import ZEROStaking from "../../contracts/deployment/deployments/rskSovrynMainnet/ZEROStaking.json";
import ZEROToken from "../../contracts/deployment/deployments/rskSovrynMainnet/ZEROToken.json";
import MultiTroveGetter from "../../contracts/deployment/deployments/rskSovrynMainnet/MultiTroveGetter.json";
import PriceFeed from "../../contracts/deployment/deployments/rskSovrynMainnet/PriceFeed.json";
import PriceFeedTestnet from "../../contracts/deployment/deployments/rskSovrynTestnet/PriceFeedTestnet.json";
import SortedTroves from "../../contracts/deployment/deployments/rskSovrynMainnet/SortedTroves.json";
import StabilityPool from "../../contracts/deployment/deployments/rskSovrynMainnet/StabilityPool.json";
import TroveManager from "../../contracts/deployment/deployments/rskSovrynMainnet/TroveManager.json";
import UpgradeableProxy from "../../contracts/artifacts/contracts/Proxy/UpgradableProxy.sol/UpgradableProxy.json";
import LiquityBaseParams from "../../contracts/deployment/deployments/rskSovrynMainnet/LiquityBaseParams.json";
import TroveManagerRedeemOps from "../../contracts/deployment/deployments/rskSovrynMainnet/TroveManagerRedeemOps.json";
import MockBalanceRedirectPresale from "../../contracts/artifacts/contracts/TestContracts/MockBalanceRedirectPresale.sol/MockBalanceRedirectPresale.json";
import FeeDistributor from "../../contracts/deployment/deployments/rskSovrynMainnet/FeeDistributor.json";
import Ownable from "../../contracts/artifacts/contracts/Dependencies/Ownable.sol/Ownable.json";

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

