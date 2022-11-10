/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "../types/factories/TestIntegration__factory";
import { LoCManager } from "../types/LoCManager";
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

describe("LoC Statistics View Operations", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let locManager: FakeContract<LoCManager>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();

    locManager = await smock.fake<LoCManager>("LoCManager");

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(locManager.address);
    await testIntegration.deployed();
  });
  describe("Get ICR of borrower", async () => {
    it("should call getNominalICR in LoC Manager", async () => {
      await testIntegration.testGetNominalICR(signers[1].address);
      expect(locManager.getNominalICR).to.have.been.calledOnceWith(
        signers[1].address
      );
    });
  });

  describe("Get entire Debt and Collateral of borrower", async () => {
    it("should call liquidate LoC function with correct number of max locs to liquadte", async () => {
      await testIntegration.testGetEntireDebtAndColl(signers[1].address);
      expect(locManager.getEntireDebtAndColl).to.have.been.calledOnceWith(
        signers[1].address
      );
    });
  });
  describe("Calculate Origination fee", async () => {
    it("should call calculateOriginationFee with the correct params", async () => {});
    await testIntegration.testCalculateOriginationFee(100);
    expect(locManager.getOriginationFee).to.have.been.calledOnceWith(100);
  });
});
