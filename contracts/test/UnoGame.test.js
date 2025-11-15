import { expect } from "chai";
import pkg from "hardhat";
const { ethers } = pkg;

describe("UnoGame Contract", function () {
  let unoGame;
  let shuffleVerifier, dealVerifier, drawVerifier, playVerifier;
  let owner, player1, player2, player3, player4;

  before(async function () {
    [owner, player1, player2, player3, player4] = await ethers.getSigners();

    console.log("\n📝 Deploying contracts...");

    // Deploy verifiers (all use UltraVerifier contract with different bytecode)
    const ShuffleVerifier = await ethers.getContractFactory("contracts/verifiers/ShuffleVerifier.sol:UltraVerifier");
    shuffleVerifier = await ShuffleVerifier.deploy();
    await shuffleVerifier.waitForDeployment();

    const DealVerifier = await ethers.getContractFactory("contracts/verifiers/DealVerifier.sol:UltraVerifier");
    dealVerifier = await DealVerifier.deploy();
    await dealVerifier.waitForDeployment();

    const DrawVerifier = await ethers.getContractFactory("contracts/verifiers/DrawVerifier.sol:UltraVerifier");
    drawVerifier = await DrawVerifier.deploy();
    await drawVerifier.waitForDeployment();

    const PlayVerifier = await ethers.getContractFactory("contracts/verifiers/PlayVerifier.sol:UltraVerifier");
    playVerifier = await PlayVerifier.deploy();
    await playVerifier.waitForDeployment();

    console.log("✅ All verifiers deployed");

    // Deploy UnoGame
    const UnoGame = await ethers.getContractFactory("UnoGame");
    unoGame = await UnoGame.deploy(
      await shuffleVerifier.getAddress(),
      await dealVerifier.getAddress(),
      await drawVerifier.getAddress(),
      await playVerifier.getAddress()
    );
    await unoGame.waitForDeployment();

    console.log("✅ UnoGame deployed\n");
  });

  describe("Deployment", function () {
    it("Should deploy with correct verifier addresses", async function () {
      expect(await unoGame.shuffleVerifier()).to.equal(await shuffleVerifier.getAddress());
      expect(await unoGame.dealVerifier()).to.equal(await dealVerifier.getAddress());
      expect(await unoGame.drawVerifier()).to.equal(await drawVerifier.getAddress());
      expect(await unoGame.playVerifier()).to.equal(await playVerifier.getAddress());
    });

    it("Should not allow deployment with zero addresses", async function () {
      const UnoGame = await ethers.getContractFactory("UnoGame");
      
      await expect(
        UnoGame.deploy(
          ethers.ZeroAddress,
          await dealVerifier.getAddress(),
          await drawVerifier.getAddress(),
          await playVerifier.getAddress()
        )
      ).to.be.revertedWithCustomError(UnoGame, "InvalidVerifierAddress");
    });
  });

  describe("Game Creation", function () {
    let gameId;

    it("Should create a new game", async function () {
      const tx = await unoGame.connect(player1).createGame();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      
      expect(event).to.not.be.undefined;
      gameId = event.args[0];
      
      expect(gameId).to.equal(1);
    });

    it("Should emit GameCreated event with correct parameters", async function () {
      await expect(unoGame.connect(player2).createGame())
        .to.emit(unoGame, "GameCreated")
        .withArgs(2, player2.address);
    });

    it("Should increment game counter", async function () {
      await unoGame.connect(player3).createGame();
      const game4 = await unoGame.connect(player4).createGame();
      const receipt = await game4.wait();
      
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      
      expect(event.args[0]).to.equal(4);
    });
  });

  describe("Join Game", function () {
    let gameId;

    beforeEach(async function () {
      const tx = await unoGame.connect(player1).createGame();
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      gameId = event.args[0];
    });

    it("Should allow players to join a game", async function () {
      await expect(unoGame.connect(player2).joinGame(gameId))
        .to.emit(unoGame, "PlayerJoined")
        .withArgs(gameId, player2.address);
    });

    it("Should not allow joining twice", async function () {
      await unoGame.connect(player2).joinGame(gameId);
      
      await expect(
        unoGame.connect(player2).joinGame(gameId)
      ).to.be.revertedWithCustomError(unoGame, "AlreadyJoined");
    });

    it("Should not allow more than 10 players", async function () {
      // Get 11 signers to test the limit
      const signers = await ethers.getSigners();
      
      // Join with first 10 players
      for (let i = 0; i < 10; i++) {
        await unoGame.connect(signers[i]).joinGame(gameId);
      }

      // 11th player should be rejected
      await expect(
        unoGame.connect(signers[10]).joinGame(gameId)
      ).to.be.revertedWithCustomError(unoGame, "GameFull");
    });

    it("Should not allow joining invalid game", async function () {
      await expect(
        unoGame.connect(player2).joinGame(999)
      ).to.be.revertedWithCustomError(unoGame, "InvalidGameId");
    });
  });

  describe("Start Game", function () {
    let gameId;

    beforeEach(async function () {
      const tx = await unoGame.connect(player1).createGame();
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      gameId = event.args[0];
    });

    it("Should start game with minimum 2 players", async function () {
      await unoGame.connect(player1).joinGame(gameId);
      await unoGame.connect(player2).joinGame(gameId);
      
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      
      await expect(unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs))
        .to.emit(unoGame, "GameStarted")
        .withArgs(gameId, ethers.hexlify(deckCommitment));
    });

    it("Should not start with less than 2 players", async function () {
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      
      await expect(
        unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs)
      ).to.be.revertedWithCustomError(unoGame, "NotEnoughPlayers");
    });

    it("Should not start already started game", async function () {
      await unoGame.connect(player1).joinGame(gameId);
      await unoGame.connect(player2).joinGame(gameId);
      
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      await unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs);
      
      await expect(
        unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs)
      ).to.be.revertedWithCustomError(unoGame, "InvalidGameStatus");
    });
  });

  describe("ZK Proof Verification Integration", function () {
    let gameId;

    beforeEach(async function () {
      const tx = await unoGame.connect(player1).createGame();
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      gameId = event.args[0];
      
      await unoGame.connect(player1).joinGame(gameId);
      await unoGame.connect(player2).joinGame(gameId);
      
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      await unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs);
    });

    it("Should accept proof commitments for shuffle", async function () {
      const moveHash = ethers.keccak256(ethers.toUtf8Bytes("shuffle_move_1"));
      const dummyProof = "0x" + "00".repeat(100);
      const publicInputs = []; // Shuffle has no public inputs

      // This will fail verification, but should route to correct verifier
      await expect(
        unoGame.connect(player1).commitMove(
          gameId,
          moveHash,
          dummyProof,
          publicInputs,
          0 // CircuitType.Shuffle
        )
      ).to.be.reverted; // Will revert on invalid proof
    });

    it("Should accept proof commitments for deal", async function () {
      const moveHash = ethers.keccak256(ethers.toUtf8Bytes("deal_move_1"));
      const dummyProof = "0x" + "00".repeat(100);
      const publicInputs = [ethers.ZeroHash]; // Deal needs public inputs

      await expect(
        unoGame.connect(player1).commitMove(
          gameId,
          moveHash,
          dummyProof,
          publicInputs,
          1 // CircuitType.Deal
        )
      ).to.be.reverted;
    });

    it("Should emit ProofVerified event on successful verification", async function () {
      // Note: This would require a valid proof from the actual circuit
      // For now, we're testing the contract structure
      console.log("    ℹ️  Valid proof verification requires actual circuit-generated proofs");
    });
  });

  describe("End Game", function () {
    let gameId;

    beforeEach(async function () {
      const tx = await unoGame.connect(player1).createGame();
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      gameId = event.args[0];
      
      await unoGame.connect(player1).joinGame(gameId);
      await unoGame.connect(player2).joinGame(gameId);
      
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      await unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs);
    });

    it("Should end a started game", async function () {
      await expect(unoGame.connect(player1).endGame(gameId, player1.address))
        .to.emit(unoGame, "GameEnded")
        .withArgs(gameId, player1.address);
    });

    it("Should not end a not-started game", async function () {
      const tx = await unoGame.connect(player3).createGame();
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      );
      const newGameId = event.args[0];

      await expect(
        unoGame.connect(player3).endGame(newGameId, player3.address)
      ).to.be.revertedWithCustomError(unoGame, "InvalidGameStatus");
    });
  });

  describe("Gas Usage", function () {
    it("Should report gas costs for common operations", async function () {
      console.log("\n    Gas Usage Report:");
      
      const createTx = await unoGame.connect(player1).createGame();
      const createReceipt = await createTx.wait();
      console.log("    Create Game:    ", createReceipt.gasUsed.toString(), "gas");
      
      const gameId = createReceipt.logs.find(
        log => log.fragment && log.fragment.name === "GameCreated"
      ).args[0];
      
      const join1Tx = await unoGame.connect(player1).joinGame(gameId);
      const join1Receipt = await join1Tx.wait();
      console.log("    Join Game (P1): ", join1Receipt.gasUsed.toString(), "gas");
      
      const join2Tx = await unoGame.connect(player2).joinGame(gameId);
      const join2Receipt = await join2Tx.wait();
      console.log("    Join Game (P2): ", join2Receipt.gasUsed.toString(), "gas");
      
      const deckCommitment = ethers.randomBytes(32);
      const shuffleProof = "0x";
      const publicInputs = [];
      const startTx = await unoGame.connect(player1).startGame(gameId, deckCommitment, shuffleProof, publicInputs);
      const startReceipt = await startTx.wait();
      console.log("    Start Game:     ", startReceipt.gasUsed.toString(), "gas");
      
      const endTx = await unoGame.connect(player1).endGame(gameId, player1.address);
      const endReceipt = await endTx.wait();
      console.log("    End Game:       ", endReceipt.gasUsed.toString(), "gas\n");
    });
  });
});
