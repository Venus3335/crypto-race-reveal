import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

// Deploy ZLottery contract
task("deploy:lottery", "Deploy ZLottery contract").setAction(
  async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, deployments } = hre;
    const { deployer } = await hre.getNamedAccounts();
    
    console.log("Deploying ZLottery contract...");
    console.log("Deployer address:", deployer);
    
    const ZLottery = await ethers.getContractFactory("ZLottery");
    const lottery = await ZLottery.deploy();
    await lottery.waitForDeployment();
    
    const contractAddress = await lottery.getAddress();
    console.log("ZLottery deployed to:", contractAddress);
    console.log("Current round:", await lottery.currentRound());
    console.log("Ticket price:", ethers.formatEther(await lottery.TICKET_PRICE()), "ETH");
  }
);

// Get contract info
task("lottery:info", "Get lottery contract information")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    
    console.log("=== ZLottery Contract Info ===");
    console.log("Contract address:", await lottery.getAddress());
    console.log("Owner:", await lottery.owner());
    console.log("Current round:", await lottery.currentRound());
    console.log("Ticket price:", ethers.formatEther(await lottery.TICKET_PRICE()), "ETH");
    console.log("Number range:", await lottery.MIN_NUMBER(), "-", await lottery.MAX_NUMBER());
    console.log("Contract balance:", ethers.formatEther(await lottery.getBalance()), "ETH");
  });

// Buy ticket
task("lottery:buy", "Buy a lottery ticket")
  .addParam("contract", "Contract address")
  .addParam("number", "Lottery number (11-99)")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi()
    const [signer] = await ethers.getSigners();
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    const number = parseInt(taskArgs.number);
    
    if (number < 11 || number > 99) {
      throw new Error("Number must be between 11 and 99");
    }
    
    console.log("Buying ticket with number:", number);
    
    // Create encrypted input
    const input = fhevm.createEncryptedInput(taskArgs.contract, signer.address);
    input.add8(number);
    const encryptedInput = await input.encrypt();
    
    // Buy ticket
    const ticketPrice = await lottery.TICKET_PRICE();
    const tx = await lottery.buyTicket(
      encryptedInput.handles[0],
      encryptedInput.inputProof,
      { value: ticketPrice }
    );
    
    await tx.wait();
    console.log("Ticket purchased successfully!");
    console.log("Transaction hash:", tx.hash);
    
    const currentRound = await lottery.currentRound();
    const userTicketCount = await lottery.getUserTicketCount(signer.address, currentRound);
    console.log("Your tickets in current round:", userTicketCount.toString());
  });

// Draw lottery
task("lottery:draw", "Draw the current lottery round")
  .addParam("contract", "Contract address")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    
    const currentRound = await lottery.currentRound();
    const isDrawn = await lottery.isRoundDrawn(currentRound);
    
    if (isDrawn) {
      console.log("Current round already drawn!");
      return;
    }
    
    const totalTickets = await lottery.totalTicketsInRound(currentRound);
    console.log("Drawing lottery for round:", currentRound.toString());
    console.log("Total tickets sold:", totalTickets.toString());
    
    const tx = await lottery.drawLottery();
    await tx.wait();
    
    console.log("Lottery drawn successfully!");
    console.log("Transaction hash:", tx.hash);
    console.log("Next round:", await lottery.currentRound());
  });

// Make winning number public
task("lottery:reveal", "Make winning number public for a round")
  .addParam("contract", "Contract address")
  .addParam("round", "Lottery round")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    const round = parseInt(taskArgs.round);
    
    const isDrawn = await lottery.isRoundDrawn(round);
    if (!isDrawn) {
      console.log("Round not drawn yet!");
      return;
    }
    
    console.log("Making winning number public for round:", round);
    
    const tx = await lottery.makeWinningNumberPublic(round);
    await tx.wait();
    
    console.log("Winning number made public!");
    console.log("Transaction hash:", tx.hash);
    console.log("You can now decrypt the winning number using the relayer SDK");
  });

// Check tickets
task("lottery:check", "Check user's tickets for a round")
  .addParam("contract", "Contract address")
  .addParam("round", "Lottery round")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const [signer] = await ethers.getSigners();
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    const round = parseInt(taskArgs.round);
    
    const userTicketCount = await lottery.getUserTicketCount(signer.address, round);
    console.log("Your tickets in round", round + ":", userTicketCount.toString());
    
    const isDrawn = await lottery.isRoundDrawn(round);
    if (!isDrawn) {
      console.log("Round not drawn yet!");
      return;
    }
    
    console.log("Checking tickets...");
    for (let i = 0; i < userTicketCount; i++) {
      try {
        const isWinner = await lottery.checkTicket(round, i);
        console.log(`Ticket ${i}: ${isWinner ? 'Winner!' : 'Not winner'}`);
      } catch (error) {
        console.log(`Ticket ${i}: Cannot check (encrypted)`);
      }
    }
  });

// Get round info
task("lottery:round", "Get information about a specific round")
  .addParam("contract", "Contract address")
  .addParam("round", "Lottery round")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    
    const lottery = await ethers.getContractAt("ZLottery", taskArgs.contract);
    const round = parseInt(taskArgs.round);
    
    console.log("=== Round", round, "Info ===");
    
    const isDrawn = await lottery.isRoundDrawn(round);
    const totalTickets = await lottery.totalTicketsInRound(round);
    const prizePool = await lottery.prizePools(round);
    
    console.log("Is drawn:", isDrawn);
    console.log("Total tickets:", totalTickets.toString());
    console.log("Prize pool:", ethers.formatEther(prizePool), "ETH");
    
    if (isDrawn) {
      console.log("Winning number: (encrypted - use reveal command to make public)");
    }
  });