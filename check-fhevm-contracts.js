// Script to check if FHEVM contracts are deployed on localhost
const { ethers } = require("hardhat");

async function main() {
  const network = await ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId);

  const fhevmAddresses = {
    acl: "0x687820221192C5B662b25367F70076A37bc79b6c",
    kms: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
    inputVerifier: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
    decryptionVerifier: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
    inputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
  };

  console.log("\nChecking FHEVM contracts on localhost...\n");

  for (const [name, address] of Object.entries(fhevmAddresses)) {
    try {
      const code = await ethers.provider.getCode(address);
      if (code && code !== "0x") {
        console.log(`✅ ${name} (${address}): DEPLOYED`);
      } else {
        console.log(`❌ ${name} (${address}): NOT DEPLOYED`);
      }
    } catch (error) {
      console.log(`❌ ${name} (${address}): ERROR - ${error.message}`);
    }
  }

  // Check coprocessor signers
  try {
    const inputVerifier = new ethers.Contract(
      fhevmAddresses.inputVerifier,
      ["function getCoprocessorSigners() view returns (address[])"],
      ethers.provider
    );
    const signers = await inputVerifier.getCoprocessorSigners();
    console.log(`\n✅ Coprocessor Signers: ${signers.length} signers found`);
    signers.forEach((signer, index) => {
      console.log(`   ${index + 1}. ${signer}`);
    });
  } catch (error) {
    console.log(`\n❌ Cannot get coprocessor signers: ${error.message}`);
    console.log("   This means FHEVM contracts are not properly deployed.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


