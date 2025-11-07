import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { ZLottery } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("ZLotterySepolia", function () {
  let signers: Signers;
  let zLotteryContract: ZLottery;
  let zLotteryContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const ZLotteryDeployment = await deployments.get("ZLottery");
      zLotteryContractAddress = ZLotteryDeployment.address;
      zLotteryContract = await ethers.getContractAt("ZLottery", ZLotteryDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should allow players to buy tickets", async function () {
    steps = 5;

    progress("Getting ticket price");
    const ticketPrice = await zLotteryContract.TICKET_PRICE();

    progress("Creating encrypted input for ticket number 42");
    const ticketNumber = 42;
    const input = fhevm.createEncryptedInput(zLotteryContractAddress, signers.alice.address);
    input.add8(ticketNumber);
    const encryptedInput = await input.encrypt();

    progress("Buying ticket");
    const tx = await zLotteryContract
      .connect(signers.alice)
      .buyTicket(encryptedInput.handles[0], encryptedInput.inputProof, {
        value: ticketPrice,
      });
    await tx.wait();

    progress("Verifying ticket count");
    const ticketCount = await zLotteryContract.getUserTicketCount(signers.alice.address, 1);
    expect(ticketCount).to.equal(1);

    progress("Test completed");
  });

  it("should allow owner to draw lottery", async function () {
    steps = 3;

    progress("Drawing lottery");
    const tx = await zLotteryContract.drawLottery();
    await tx.wait();

    progress("Verifying round is drawn");
    const isDrawn = await zLotteryContract.isRoundDrawn(1);
    expect(isDrawn).to.be.true;

    progress("Test completed");
  });

  it("should allow players to check their tickets", async function () {
    steps = 4;

    progress("Getting winning number");
    const winningNumber = await zLotteryContract.getWinningNumber(1);

    progress("Checking ticket");
    const tx = await zLotteryContract.connect(signers.alice).checkTicket(1, 0);
    await tx.wait();

    progress("Getting encrypted result");
    const encryptedResult = await zLotteryContract.connect(signers.alice).checkTicket(1, 0);
    
    progress("Test completed");
  });

  it("should allow players to decrypt their ticket number", async function () {
    steps = 3;

    progress("Getting encrypted ticket");
    const encryptedTicket = await zLotteryContract.getUserTicket(1, 0);

    progress("Decrypting ticket");
    const decryptedTicket = await fhevm.userDecryptEuint(
      FhevmType.euint8,
      encryptedTicket,
      zLotteryContractAddress,
      signers.alice,
    );

    expect(decryptedTicket).to.be.gte(11);
    expect(decryptedTicket).to.be.lte(99);

    progress("Test completed");
  });
});


