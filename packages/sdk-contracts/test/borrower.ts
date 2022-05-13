/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "./../types/factories/TestIntegration__factory";
import { BorrowerOperations } from "../types/BorrowerOperations";
import hre, { ethers, deployments } from "hardhat";
import chai from "chai";
import {
  MockContractFactory,
  MockContract,
  FakeContract,
  smock,
} from "@defi-wonderland/smock";

const { expect } = chai;
// const { getExtendedArtifact } = deployments;
chai.use(smock.matchers);

describe("Borrower Library Operations", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let borrower: FakeContract<BorrowerOperations>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();
    const borrowerFactory = await ethers.getContractFactory(
      "BorrowerOperations"
    );

    // const borrowerFactory = await getExtendedArtifact("BorrowerOperations");
    borrower = await smock.fake<BorrowerOperations>(borrowerFactory);

    /*  borrower = await smock.fake<BorrowerOperations>("BorrowerOperations", {
      address: signers[3].address,
    }); */

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(borrower.address);
    await testIntegration.deployed();
  });

  describe("Borrowing ZUSD", async () => {
    it("should call withdraw function with correct parameters", async () => {
      await testIntegration.testWithdrawZUSD(
        1,
        100,
        signers[0].address,
        signers[2].address
      );
      expect(borrower.withdrawZUSD).to.have.been.calledOnceWith(
        1,
        100,
        signers[0].address,
        signers[2].address
      );
    });
  });
  describe("Repaying ZUSD", async () => {
    it("should call repay function with correct parameters", async () => {
      await testIntegration.testRepayZUSD(
        100,
        signers[0].address,
        signers[2].address
      );
      expect(borrower.repayZUSD).to.have.been.calledOnceWith(
        100,
        signers[0].address,
        signers[2].address
      );
    });
  });
  describe("Close Credit Line and Withdraw Collateral", async () => {
    it("should call close trove function", async () => {
      await testIntegration.testCloseCreditLineAndWithdrawCollateral();
      expect(borrower.closeTrove).to.be.calledOnce;
    });
  });
});
