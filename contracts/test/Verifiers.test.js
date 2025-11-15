import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("ZK Verifiers", function () {
  let shuffleVerifier, dealVerifier, drawVerifier, playVerifier;
  let owner, player1, player2;

  before(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    console.log("\nDeploying verifier contracts...");

    // Deploy all verifiers (all use UltraVerifier contract with different bytecode)
    const ShuffleVerifier = await ethers.getContractFactory("contracts/verifiers/ShuffleVerifier.sol:UltraVerifier");
    shuffleVerifier = await ShuffleVerifier.deploy();
    await shuffleVerifier.waitForDeployment();
    console.log("ShuffleVerifier deployed");

    const DealVerifier = await ethers.getContractFactory("contracts/verifiers/DealVerifier.sol:UltraVerifier");
    dealVerifier = await DealVerifier.deploy();
    await dealVerifier.waitForDeployment();
    console.log("DealVerifier deployed");

    const DrawVerifier = await ethers.getContractFactory("contracts/verifiers/DrawVerifier.sol:UltraVerifier");
    drawVerifier = await DrawVerifier.deploy();
    await drawVerifier.waitForDeployment();
    console.log("DrawVerifier deployed");

    const PlayVerifier = await ethers.getContractFactory("contracts/verifiers/PlayVerifier.sol:UltraVerifier");
    playVerifier = await PlayVerifier.deploy();
    await playVerifier.waitForDeployment();
    console.log("PlayVerifier deployed\n");
  });

  describe("Deployment", function () {
    it("Should deploy all verifiers successfully", async function () {
      expect(await shuffleVerifier.getAddress()).to.be.properAddress;
      expect(await dealVerifier.getAddress()).to.be.properAddress;
      expect(await drawVerifier.getAddress()).to.be.properAddress;
      expect(await playVerifier.getAddress()).to.be.properAddress;
    });

    it("Should have correct verification key hashes", async function () {
      // These are deterministic based on the circuits
      // Just checking they're not zero
      const shuffleVkHash = await shuffleVerifier.getVerificationKeyHash();
      const dealVkHash = await dealVerifier.getVerificationKeyHash();
      
      expect(shuffleVkHash).to.not.equal(ethers.ZeroHash);
      expect(dealVkHash).to.not.equal(ethers.ZeroHash);
      
      console.log("    Shuffle VK Hash:", shuffleVkHash);
      console.log("    Deal VK Hash:", dealVkHash);
    });
  });

  describe("Verification Interface", function () {
    it("Should have verify function on all verifiers", async function () {
      expect(shuffleVerifier.verify).to.exist;
      expect(dealVerifier.verify).to.exist;
      expect(drawVerifier.verify).to.exist;
      expect(playVerifier.verify).to.exist;
    });

    it("Should reject invalid proofs", async function () {
      const dummyProof = "0x" + "00".repeat(100); // Invalid proof
      const emptyPublicInputs = []; // Shuffle has no public inputs

      await expect(
        shuffleVerifier.verify(dummyProof, emptyPublicInputs)
      ).to.be.reverted; // Will fail on invalid proof format or verification
    });

    it("Should handle empty proof gracefully", async function () {
      const emptyProof = "0x";
      const emptyPublicInputs = [];

      await expect(
        shuffleVerifier.verify(emptyProof, emptyPublicInputs)
      ).to.be.reverted;
    });
  });

  describe("Gas Estimation", function () {
    it("Should estimate gas for verification calls", async function () {
      // Note: These will fail because we don't have real proofs
      // But we can see the gas estimates for the failed attempts
      const dummyProof = "0x" + "00".repeat(2000);
      
      try {
        const shuffleGas = await shuffleVerifier.verify.estimateGas(dummyProof, []);
        console.log("    ShuffleVerifier gas estimate:", shuffleGas.toString());
      } catch (e) {
        console.log("    ShuffleVerifier: Need valid proof for gas estimate");
      }

      try {
        const dealGas = await dealVerifier.verify.estimateGas(dummyProof, [ethers.ZeroHash]);
        console.log("    DealVerifier gas estimate:", dealGas.toString());
      } catch (e) {
        console.log("    DealVerifier: Need valid proof for gas estimate");
      }
    });
  });

  describe("Contract Size", function () {
    it("Should report deployed bytecode size", async function () {
      const shuffleCode = await ethers.provider.getCode(await shuffleVerifier.getAddress());
      const dealCode = await ethers.provider.getCode(await dealVerifier.getAddress());
      const drawCode = await ethers.provider.getCode(await drawVerifier.getAddress());
      const playCode = await ethers.provider.getCode(await playVerifier.getAddress());

      console.log("\n    Verifier Contract Sizes:");
      console.log("    ShuffleVerifier:", (shuffleCode.length - 2) / 2, "bytes");
      console.log("    DealVerifier:   ", (dealCode.length - 2) / 2, "bytes");
      console.log("    DrawVerifier:   ", (drawCode.length - 2) / 2, "bytes");
      console.log("    PlayVerifier:   ", (playCode.length - 2) / 2, "bytes\n");

      // Verify they're within reasonable size (< 24KB contract size limit)
      expect((shuffleCode.length - 2) / 2).to.be.lessThan(24576);
      expect((dealCode.length - 2) / 2).to.be.lessThan(24576);
    });
  });
});
