import { ethers } from "hardhat";
import { ZLottery } from "../types";

async function main() {
  console.log("Deploying ZLottery contract to Sepolia...");

  // 获取部署者账户
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  if (balance < ethers.parseEther("0.01")) {
    console.warn("Warning: Account balance is low. Make sure you have enough ETH for deployment.");
  }

  // 部署合约
  const ZLotteryFactory = await ethers.getContractFactory("ZLottery");
  const zlottery = await ZLotteryFactory.deploy() as ZLottery;

  await zlottery.waitForDeployment();
  const address = await zlottery.getAddress();

  console.log("✅ ZLottery deployed to:", address);
  console.log("✅ Transaction hash:", zlottery.deploymentTransaction()?.hash);
  console.log("✅ Deployer:", deployer.address);

  // 验证基本信息
  const owner = await zlottery.owner();
  const ticketPrice = await zlottery.TICKET_PRICE();
  const currentRound = await zlottery.currentRound();

  console.log("\n📊 Contract Info:");
  console.log("  Owner:", owner);
  console.log("  Ticket Price:", ethers.formatEther(ticketPrice), "ETH");
  console.log("  Current Round:", currentRound.toString());

  console.log("\n🔗 Etherscan Link:");
  console.log(`https://sepolia.etherscan.io/address/${address}`);

  console.log("\n📝 Save this contract address for frontend:");
  console.log(`Contract Address: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });