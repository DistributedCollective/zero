import { objToString } from "@sovryn-zero/fuzzer/utils";
import { BorrowerImpl } from "../types/BorrowerImpl";
import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { TestIntegration } from "../types/TestIntegration";
chai.use(solidity);
const { expect } = chai;
describe("Counter", () => {
  let testIntegration: TestIntegration;
  let borrowerImpl: BorrowerImpl;
  beforeEach(async () => {
    // 1
    const signers = await ethers.getSigners();
    // 2
    const integrationFactory = await ethers.getContractFactory(
      "TestIntegration",
      signers[0]
    );

    const borrowerImplFactory = await ethers.getContractFactory(
      "BorrowerImpl",
      signers[1]
    );
    borrowerImpl = (await borrowerImplFactory.deploy()) as BorrowerImpl;
    await borrowerImpl.deployed();
    testIntegration = (await integrationFactory.deploy(
      borrowerImpl.address
    )) as TestIntegration;
    await testIntegration.deployed();
    console.log(borrowerImpl.address);
  });
  // 4
  describe("count up", async () => {
    it("should count up", async () => {
      const signers = await ethers.getSigners();
      expect(
        await testIntegration.testOpenCreditLine(
          1,
          100,
          signers[0].address,
          signers[0].address
        )
      ).to.emit(borrowerImpl, "TroveCreated");
    });
  });
});
