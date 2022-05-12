import { ethers } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
// import { TestIntegration } from "../types/TestIntegration";

chai.use(solidity);
const { expect } = chai;
describe("Counter", () => {
  let testIntegration: any;
  let borrowerImpl: any;
  beforeEach(async () => {
    const signers = await ethers.getSigners();

    // Borrower Contract deploy
    const borrowerImplFactory = await ethers.getContractFactory(
      "BorrowerOperations",
      signers[1]
    );
    borrowerImpl = await borrowerImplFactory.deploy();
    await borrowerImpl.deployed();

    // Integration Contract deploy
    const integrationFactory = await ethers.getContractFactory(
      "TestIntegration",
      signers[0]
    );
    testIntegration = await integrationFactory.deploy(borrowerImpl.address);
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
