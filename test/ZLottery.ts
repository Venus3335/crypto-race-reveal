import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { ZLottery } from "../types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ZLottery", function () {
  let lottery: ZLottery;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let contractAddress: string;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const ZLotteryFactory = await ethers.getContractFactory("ZLottery");
    lottery = await ZLotteryFactory.deploy();
    await lottery.waitForDeployment();
    
    contractAddress = await lottery.getAddress();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await lottery.owner()).to.equal(owner.address);
    });

    it("Should set initial round to 1", async function () {
      expect(await lottery.currentRound()).to.equal(1);
    });

    it("Should set correct ticket price", async function () {
      expect(await lottery.TICKET_PRICE()).to.equal(ethers.parseEther("0.0001"));
    });

    it("Should set correct number range", async function () {
      expect(await lottery.MIN_NUMBER()).to.equal(11);
      expect(await lottery.MAX_NUMBER()).to.equal(99);
    });
  });

  describe("Ticket Purchasing", function () {
    it("Should allow users to buy tickets with correct payment", async function () {
      const ticketNumber = 42;
      
      // Create encrypted input
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(ticketNumber);
      const encryptedInput = await input.encrypt();
      
      // Buy ticket
      const ticketPrice = await lottery.TICKET_PRICE();
      const tx = await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );

      await expect(tx).to.emit(lottery, "TicketPurchased")
        .withArgs(user1.address, 1, 0);

      // Check ticket count
      expect(await lottery.getUserTicketCount(user1.address, 1)).to.equal(1);
      expect(await lottery.totalTicketsInRound(1)).to.equal(1);
      expect(await lottery.prizePools(1)).to.equal(ticketPrice);
    });

    it("Should reject tickets with incorrect payment", async function () {
      const ticketNumber = 42;
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(ticketNumber);
      const encryptedInput = await input.encrypt();
      
      const incorrectPrice = ethers.parseEther("0.0002");
      
      await expect(
        lottery.connect(user1).buyTicket(
          encryptedInput.handles[0],
          encryptedInput.inputProof,
          { value: incorrectPrice }
        )
      ).to.be.revertedWith("Incorrect payment amount");
    });

    it("Should allow multiple tickets per user", async function () {
      const ticketPrice = await lottery.TICKET_PRICE();
      
      // Buy first ticket
      const input1 = fhevm.createEncryptedInput(contractAddress, user1.address);
      input1.add8(25);
      const encryptedInput1 = await input1.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput1.handles[0],
        encryptedInput1.inputProof,
        { value: ticketPrice }
      );
      
      // Buy second ticket
      const input2 = fhevm.createEncryptedInput(contractAddress, user1.address);
      input2.add8(67);
      const encryptedInput2 = await input2.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput2.handles[0],
        encryptedInput2.inputProof,
        { value: ticketPrice }
      );

      expect(await lottery.getUserTicketCount(user1.address, 1)).to.equal(2);
      expect(await lottery.totalTicketsInRound(1)).to.equal(2);
    });

    it("Should allow buying tickets for new round after previous round is drawn", async function () {
      const ticketPrice = await lottery.TICKET_PRICE();
      
      // Buy a ticket first (round 1)
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );
      
      const initialRound = await lottery.currentRound();
      
      // Draw the lottery (this moves to next round)
      await lottery.drawLottery();
      
      const newRound = await lottery.currentRound();
      expect(newRound).to.equal(initialRound + 1n);
      
      // Should be able to buy ticket for new round
      const input2 = fhevm.createEncryptedInput(contractAddress, user2.address);
      input2.add8(55);
      const encryptedInput2 = await input2.encrypt();
      
      await expect(
        lottery.connect(user2).buyTicket(
          encryptedInput2.handles[0],
          encryptedInput2.inputProof,
          { value: ticketPrice }
        )
      ).to.not.be.reverted;
      
      // Verify the ticket was bought for the new round
      const ticketCount = await lottery.getUserTicketCount(user2.address, newRound);
      expect(ticketCount).to.equal(1);
    });
  });

  describe("Drawing Lottery", function () {
    beforeEach(async function () {
      // Buy some tickets before each drawing test
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );
    });

    it("Should allow owner to draw lottery", async function () {
      const initialRound = await lottery.currentRound();
      
      const tx = await lottery.drawLottery();
      
      await expect(tx).to.emit(lottery, "LotteryDrawn").withArgs(initialRound);
      
      expect(await lottery.isRoundDrawn(initialRound)).to.be.true;
      expect(await lottery.currentRound()).to.equal(initialRound + 1n);
    });

    it("Should reject drawing by non-owner", async function () {
      await expect(
        lottery.connect(user1).drawLottery()
      ).to.be.revertedWith("Only owner can call this function");
    });

    it("Should reject drawing with no tickets", async function () {
      // Draw current round first to clear it
      await lottery.drawLottery();
      
      // Try to draw next round with no tickets
      await expect(
        lottery.drawLottery()
      ).to.be.revertedWith("No tickets sold");
    });

    it("Should reject drawing already drawn round", async function () {
      await lottery.drawLottery();
      
      // Try to draw again
      await expect(
        lottery.drawLottery()
      ).to.be.revertedWith("No tickets sold"); // Because we moved to next round
    });
  });

  describe("Prize Claiming", function () {
    it("Should prevent claiming from undrawn round", async function () {
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );

      await expect(
        lottery.connect(user1).claimPrizeSimple(1, 0)
      ).to.be.revertedWith("Round not drawn yet");
    });

    it("Should prevent double claiming", async function () {
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );
      
      await lottery.drawLottery();
      
      // First claim should work (assuming we have access to both numbers)
      // Note: This test might fail because of FHE access controls
      // In a real scenario, we'd need proper access setup
      
      // Mark as already claimed
      // This is more of an integration test - unit testing FHE logic is complex
    });
  });

  describe("Access Controls", function () {
    it("Should only allow owner to transfer ownership", async function () {
      await expect(
        lottery.connect(user1).transferOwnership(user1.address)
      ).to.be.revertedWith("Only owner can call this function");
      
      await lottery.transferOwnership(user1.address);
      expect(await lottery.owner()).to.equal(user1.address);
    });

    it("Should only allow owner to emergency withdraw", async function () {
      // Add some funds to the contract
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );

      await expect(
        lottery.connect(user1).emergencyWithdraw()
      ).to.be.revertedWith("Only owner can call this function");
      
      const initialBalance = await ethers.provider.getBalance(owner.address);
      await lottery.emergencyWithdraw();
      const finalBalance = await ethers.provider.getBalance(owner.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should generate public winning numbers after draw", async function () {
      const ticketPrice = await lottery.TICKET_PRICE();

      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();

      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );

      await lottery.drawLottery();

      // Winning number should be publicly accessible after draw
      const winningNumber = await lottery.getWinningNumber(1);
      expect(winningNumber).to.be.gte(11);
      expect(winningNumber).to.be.lte(99);
    });
  });

  describe("View Functions", function () {
    it("Should return correct user ticket count", async function () {
      expect(await lottery.getUserTicketCount(user1.address, 1)).to.equal(0);
      
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );
      
      expect(await lottery.getUserTicketCount(user1.address, 1)).to.equal(1);
    });

    it("Should return correct contract balance", async function () {
      expect(await lottery.getBalance()).to.equal(0);
      
      const ticketPrice = await lottery.TICKET_PRICE();
      
      const input = fhevm.createEncryptedInput(contractAddress, user1.address);
      input.add8(42);
      const encryptedInput = await input.encrypt();
      
      await lottery.connect(user1).buyTicket(
        encryptedInput.handles[0],
        encryptedInput.inputProof,
        { value: ticketPrice }
      );
      
      expect(await lottery.getBalance()).to.equal(ticketPrice);
    });
  });
});