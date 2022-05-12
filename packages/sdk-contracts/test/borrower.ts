/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "./../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "./../types/factories/TestIntegration__factory";
import { BorrowerImpl } from "../types/BorrowerImpl";
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

describe("Borrower Library", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let borrower: FakeContract<BorrowerImpl>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();

    borrower = await smock.fake<BorrowerImpl>("BorrowerImpl", {
      address: signers[3].address,
    });

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(borrower.address);
    await testIntegration.deployed();
  });

  describe("Borrowing operations", async () => {
    it("should call open trove", async () => {
      await testIntegration.testOpenCreditLine(
        1,
        100,
        signers[0].address,
        signers[2].address
      );
      expect(borrower.openTrove).to.have.been.called;
    });
  });
});
