const fs = require('fs');
const path = require('path');

const network = process.argv[2] || 'localhost';
const contractDeploymentPath = path.join(__dirname, '..', 'deployments', network, 'ZLottery.json');
const frontendConfigPath = path.join(__dirname, '..', 'ui', 'src', 'config', 'contracts.ts');

console.log(`📋 Network: ${network}`);
console.log(`📋 Contract deployment path: ${contractDeploymentPath}`);

if (!fs.existsSync(contractDeploymentPath)) {
  console.error(`❌ Contract deployment file not found: ${contractDeploymentPath}`);
  console.error(`   Please deploy the contract first: npm run deploy:${network}`);
  process.exit(1);
}

const deploymentData = JSON.parse(fs.readFileSync(contractDeploymentPath, 'utf8'));
const contractAddress = deploymentData.address;
const contractABI = deploymentData.abi;

console.log(`📋 Contract address: ${contractAddress}`);
console.log(`📋 ABI functions: ${contractABI.filter(item => item.type === 'function').length}`);

const networkComment = network === 'localhost' 
  ? '// ZLottery contract - deployed on localhost'
  : `// ZLottery contract - deployed on ${network}`;

const newConfig = `${networkComment}
export const CONTRACT_ADDRESS = '${contractAddress}';

// Generated ABI from deployed contract - Auto-synced from deployments/${network}/ZLottery.json
export const CONTRACT_ABI = ${JSON.stringify(contractABI, null, 2)} as const;
`;

fs.writeFileSync(frontendConfigPath, newConfig, 'utf8');

console.log(`✅ Frontend ABI updated successfully!`);
console.log(`   Address: ${contractAddress}`);
console.log(`   ABI entries: ${contractABI.length}`);


