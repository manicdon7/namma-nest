import hre from "hardhat";
const { ethers, network } = hre;

async function main() {
  const signers = await ethers.getSigners();
  if (!signers.length || !signers[0]) {
    console.error("\n❌  No deployer account found.");
    console.error("   Create contracts/.env with your private key:");
    console.error("   DEPLOYER_PRIVATE_KEY=your_private_key_without_0x\n");
    process.exit(1);
  }
  const deployer = signers[0];

  console.log("─────────────────────────────────────────");
  console.log("  NammaNest Payments — Deployment");
  console.log("─────────────────────────────────────────");
  console.log("Network    :", network.name);
  console.log("Deployer   :", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance    :", ethers.formatEther(balance), "BTC");

  // Search fee: 0.0001 BTC in wei
  const searchFeeWei = process.env.SEARCH_FEE_WEI
    ? BigInt(process.env.SEARCH_FEE_WEI)
    : ethers.parseEther("0.0001");

  console.log("Search fee :", ethers.formatEther(searchFeeWei), "BTC");
  console.log("");

  const Factory = await ethers.getContractFactory("NammaNestPayments");
  const contract = await Factory.deploy(searchFeeWei);
  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("✅ NammaNestPayments deployed!");
  console.log("   Contract address :", address);
  console.log("   Tx hash          :", contract.deploymentTransaction()?.hash ?? "—");
  console.log("");
  console.log("Add the following to your Next.js .env:");
  console.log(`   NEXT_PUBLIC_PAYMENT_CONTRACT=${address}`);
  console.log(`   PAYMENT_CONTRACT_ADDRESS=${address}`);
  console.log("─────────────────────────────────────────");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
