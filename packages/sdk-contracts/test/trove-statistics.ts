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

describe("Trove Statistics View Operations", () => {
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
  describe("Get ICR of borrower", async () => {
    it("should call getNominalICR in Trove Manager", async () => {
      await testIntegration.testGetNominalICR(signers[1].address);
      expect(troveManager.getNominalICR).to.have.been.calledOnceWith(
        signers[1].address
      );
    });
  });

  describe("Get entire Debt and Collateral of borrower", async () => {
    it("should call liquidate trove function with correct number of max troves to liquadte", async () => {
      await testIntegration.testGetEntireDebtAndColl(signers[1].address);
      expect(troveManager.getEntireDebtAndColl).to.have.been.calledOnceWith(
        signers[1].address
      );
    });
  });
  describe("Calculate Borrowing Fee", async () => {
    it("should call calculateBorrowingFee with the correct params", async () => {});
    await testIntegration.testCalculateBorrowingFee(100);
    expect(troveManager.getBorrowingFee).to.have.been.calledOnceWith(100);
  });
});
