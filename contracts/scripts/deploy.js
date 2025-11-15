import hre from "hardhat";
const { ethers } = hre;
import fs from "fs/promises";

async function main() {
    console.log("\nDeploying UNO Game Contracts to Base Sepolia...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ========================================
    // 1. Deploy Verifier Contracts
    // ========================================
    
    console.log("Deploying ShuffleVerifier...");
    const ShuffleVerifier = await ethers.getContractFactory("contracts/verifiers/ShuffleVerifier.sol:UltraVerifier");
    const shuffleVerifier = await ShuffleVerifier.deploy();
    await shuffleVerifier.waitForDeployment();
    const shuffleVerifierAddress = await shuffleVerifier.getAddress();
    console.log("ShuffleVerifier deployed to:", shuffleVerifierAddress);

    console.log("\nDeploying DealVerifier...");
    const DealVerifier = await ethers.getContractFactory("contracts/verifiers/DealVerifier.sol:UltraVerifier");
    const dealVerifier = await DealVerifier.deploy();
    await dealVerifier.waitForDeployment();
    const dealVerifierAddress = await dealVerifier.getAddress();
    console.log("DealVerifier deployed to:", dealVerifierAddress);

    console.log("\nDeploying DrawVerifier...");
    const DrawVerifier = await ethers.getContractFactory("contracts/verifiers/DrawVerifier.sol:UltraVerifier");
    const drawVerifier = await DrawVerifier.deploy();
    await drawVerifier.waitForDeployment();
    const drawVerifierAddress = await drawVerifier.getAddress();
    console.log("DrawVerifier deployed to:", drawVerifierAddress);

    console.log("\nDeploying PlayVerifier...");
    const PlayVerifier = await ethers.getContractFactory("contracts/verifiers/PlayVerifier.sol:UltraVerifier");
    const playVerifier = await PlayVerifier.deploy();
    await playVerifier.waitForDeployment();
    const playVerifierAddress = await playVerifier.getAddress();
    console.log("PlayVerifier deployed to:", playVerifierAddress);

    // ========================================
    // 2. Deploy UnoGame Contract
    // ========================================

    console.log("\nDeploying UnoGame...");

    const UnoGame = await ethers.getContractFactory("UnoGame");
    const unoGame = await UnoGame.deploy(
        shuffleVerifierAddress,
        dealVerifierAddress,
        drawVerifierAddress,
        playVerifierAddress
    );
    
    await unoGame.waitForDeployment();
    const unoGameAddress = await unoGame.getAddress();
    console.log("UnoGame deployed to:", unoGameAddress);

    // ========================================
    // 3. Deployment Summary
    // ========================================

    const network = await ethers.provider.getNetwork();
    console.log("\n" + "=".repeat(60));
    console.log("DEPLOYMENT SUMMARY");
    console.log("═".repeat(60));
    console.log("\nNetwork:        ", network.name, `(Chain ID: ${network.chainId})`);
    console.log("Deployer:       ", deployer.address);
    console.log("\nVerifier Contracts:");
    console.log("  ShuffleVerifier:", shuffleVerifierAddress);
    console.log("  DealVerifier:   ", dealVerifierAddress);
    console.log("  DrawVerifier:   ", drawVerifierAddress);
    console.log("  PlayVerifier:   ", playVerifierAddress);
    console.log("\nGame Contract:");
    console.log("  UnoGame:        ", unoGameAddress);
    console.log("\n" + "=".repeat(60));

    // ========================================
    // 4. Save Deployment Addresses
    // ========================================

    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(),
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            verifiers: {
                shuffle: shuffleVerifierAddress,
                deal: dealVerifierAddress,
                draw: drawVerifierAddress,
                play: playVerifierAddress
            },
            game: unoGameAddress
        }
    };

    try {
        await fs.mkdir('./deployments', { recursive: true });
        await fs.writeFile('./deployments/latest.json', JSON.stringify(deploymentInfo, null, 2));
        console.log("\nDeployment info saved to: ./deployments/latest.json");
    } catch (error) {
        console.warn("\nWarning: Could not save deployment file:", error.message);
    }

    // ========================================
    // 5. Verification Instructions
    // ========================================

    console.log("\nContract Verification Commands:");
    console.log("─".repeat(60));
    console.log("\npnpm hardhat verify --network baseSepolia", shuffleVerifierAddress);
    console.log("pnpm hardhat verify --network baseSepolia", dealVerifierAddress);
    console.log("pnpm hardhat verify --network baseSepolia", drawVerifierAddress);
    console.log("pnpm hardhat verify --network baseSepolia", playVerifierAddress);
    console.log("pnpm hardhat verify --network baseSepolia", unoGameAddress,
        shuffleVerifierAddress,
        dealVerifierAddress,
        drawVerifierAddress,
        playVerifierAddress
    );
    console.log("-".repeat(60));

    console.log("\nDeployment complete!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
