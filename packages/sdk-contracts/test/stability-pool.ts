/* eslint-disable no-unused-expressions */
/* eslint-disable camelcase */
/* eslint-disable node/no-missing-import */

import { TestIntegration } from "../types/TestIntegration";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TestIntegration__factory } from "../types/factories/TestIntegration__factory";
import { StabilityPool } from "../types/StabilityPool";
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

describe("Stability Pool Operations", () => {
  let testIntegrationFactory: MockContractFactory<TestIntegration__factory>;
  let testIntegration: MockContract<TestIntegration>;
  let stabilityPool: FakeContract<StabilityPool>;
  let signers: SignerWithAddress[];
  beforeEach(async () => {
    signers = await ethers.getSigners();

    stabilityPool = await smock.fake<StabilityPool>("StabilityPool");

    testIntegrationFactory = await smock.mock<TestIntegration__factory>(
      "TestIntegration"
    );

    testIntegration = await testIntegrationFactory.deploy(
      stabilityPool.address
    );
    await testIntegration.deployed();
  });
  describe("Provide funds to Stability Pool", async () => {
    it("should call provideToSP with correct parameters", async () => {});
    await testIntegration.testProvideToSP(100);
    expect(stabilityPool.provideToSP).to.be.calledWith(100, 0x0);
  });
  describe("Withdraw funds from Stability Pool", async () => {
    it("should call provideToSP with correct parameters", async () => {});
    await testIntegration.testWithdrawFromSP(100);
    expect(stabilityPool.withdrawFromSP).to.be.calledWith(100, 0x0);
  });
  describe("Withdraw RBTC gain to trove", async () => {
    it("should call withdrawETHGainToTrove with borrower address as parameters", async () => {});
    await testIntegration.testWithdrawRBTCGainToTrove();
    expect(stabilityPool.withdrawETHGainToTrove).to.be.calledWith(
      signers[0].address,
      signers[0].address
    );
  });
});
