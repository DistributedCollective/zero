/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "../types/factories/TestIntegration__factory";
import { TroveManager } from "../types/TroveManager";
import { ethers } from "hardhat";
import chai from "chai";
import {
  MockContractFactory,
  MockContract,
  FakeContract,
  smock,
} from "@defi-wonderland/smock";

const { expect } = chai;
chai.use(smock.matchers);

describe("Liquidation Library Operations", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let troveManager: FakeContract<TroveManager>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();

    troveManager = await smock.fake<TroveManager>("TroveManager");

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(troveManager.address);
    await testIntegration.deployed();
  });

  describe("Borrower Liquidation", async () => {
    it("should call liquidate function with borrower address", async () => {
      await testIntegration.testBorrowerLiquidation(signers[1].address);
      expect(troveManager.liquidate).to.have.been.calledOnceWith(
        signers[1].address
      );
    });
  });

  describe("Liquidate N positions", async () => {
    it("should call liquidate trove function with correct number of max troves to liquadte", async () => {
      const getRandomNumber = (min: number, max: number) => {
        return Math.floor(Math.random() * (max - min)) + min;
      };
      const maxLiquidations = getRandomNumber(1, 100);
      await testIntegration.testNPositionsLiquidation(maxLiquidations);
      expect(troveManager.liquidateTroves).to.have.been.calledOnceWith(maxLiquidations);
    });
  });
});
