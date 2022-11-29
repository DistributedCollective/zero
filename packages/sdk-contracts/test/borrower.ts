/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "./../types/factories/TestIntegration__factory";
import { BorrowerOperations } from "../types/BorrowerOperations";
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

describe("Borrower Library Operations", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let borrower: FakeContract<BorrowerOperations>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();

    borrower = await smock.fake<BorrowerOperations>("BorrowerOperations");

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(borrower.address);
    await testIntegration.deployed();
  });

  describe("Borrowing ZUSD", async () => {
    it("should call withdraw function with correct parameters", async () => {
      await testIntegration.testOpenCreditLine(1, 100, {
        value: ethers.utils.parseEther("1.0"),
      });
      expect(borrower.openLoC).to.have.been.calledOnceWith(
        1,
        100,
        signers[0].address,
        signers[0].address
      );
    });
  });

  describe("Withdrawing ZUSD", async () => {
    it("should call withdraw function with correct parameters", async () => {
      await testIntegration.testWithdrawZUSD(1, 100);
      expect(borrower.withdrawZUSD).to.have.been.calledOnceWith(
        1,
        100,
        signers[0].address,
        signers[0].address
      );
    });
  });
  describe("Withdrawing collateral", async () => {
    it("should call withdraw collateral function with correct parameters", async () => {
      await testIntegration.testWithdrawCollateral(1);
      expect(borrower.withdrawColl).to.have.been.calledOnceWith(
        1,
        signers[0].address,
        signers[0].address
      );
    });
  });
  describe("Repaying ZUSD", async () => {
    it("should call repay function with correct parameters", async () => {
      await testIntegration.testRepayZUSD(100);
      expect(borrower.repayZUSD).to.have.been.calledOnceWith(
        100,
        signers[0].address,
        signers[0].address
      );
    });
  });
  describe("Adding collateral", async () => {
    it("should call add collateral function with correct parameters", async () => {
      await testIntegration.testAddCollateral({
        value: ethers.utils.parseEther("1.0"),
      });
      expect(borrower.addColl).to.have.been.calledOnceWith(
        signers[0].address,
        signers[0].address
      );
    });
  });
  describe("Close Credit Line and Withdraw Collateral", async () => {
    it("should call close LoC function", async () => {
      await testIntegration.testCloseCreditLineAndWithdrawCollateral();
      expect(borrower.closeLoC).to.be.calledOnce;
    });
  });
});
