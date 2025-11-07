# FHEVM 合约未部署 - 手动修复方案

## 问题诊断

检查结果显示：
- ✅ KMS 合约已部署 (`0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC`)
- ❌ ACL 合约未部署 (`0x687820221192C5B662b25367F70076A37bc79b6c`)
- ❌ Input Verifier 合约未部署 (`0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4`)
- ❌ Decryption Verifier 合约未部署 (`0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1`)
- ❌ Input Verification 合约未部署 (`0x7048C39f048125eDa9d678AEbaDfB22F7900a29F`)

## 解决方案

### 方案 1: 重启 Hardhat 节点（推荐）

FHEVM 插件应该在节点启动时自动部署所有合约。如果部分合约未部署，可能是节点启动时插件没有完全初始化。

**步骤：**

1. **停止所有运行的节点：**
   ```powershell
   taskkill /F /IM node.exe
   ```

2. **启动 Hardhat 节点：**
   ```bash
   cd d:\cursor\code\ZLottery-main
   npx hardhat node
   ```

3. **等待节点完全启动**（10-15秒）

4. **检查合约部署状态：**
   ```bash
   npm run check:fhevm
   ```

5. **如果合约仍未部署，尝试方案 2**

### 方案 2: 使用 Sepolia 网络（最简单）

如果 localhost 上的 FHEVM 合约无法正确部署，可以使用 Sepolia 测试网，它已经有完整的 FHEVM 基础设施。

**步骤：**

1. **更新前端配置使用 SepoliaConfig：**
   
   修改 `ui/src/hooks/useZamaInstance.ts`：
   ```typescript
   // 对于 localhost 网络，也使用 SepoliaConfig
   if (chainId === 31337) {
     // 使用 SepoliaConfig，但保持 localhost 网络提供者用于交易
     config = {
       ...SepoliaConfig,
       network: window.ethereum || "http://localhost:8545",
       chainId: 31337,
     };
   } else {
     config = SepoliaConfig;
   }
   ```

2. **部署合约到 Sepolia：**
   ```bash
   npx hardhat deploy --network sepolia
   ```

3. **更新前端配置：**
   ```bash
   node scripts/update-frontend-abi.js sepolia
   ```

4. **连接钱包到 Sepolia 网络**

### 方案 3: 使用硬编码地址但接受部分功能限制

如果只有 KMS 合约部署了，可以尝试只使用已部署的合约，但这可能导致某些功能不可用。

**不推荐此方案，因为协处理器合约是必需的。**

## 推荐操作

**立即执行：**

1. 停止所有节点进程
2. 重新启动 Hardhat 节点
3. 等待 15-20 秒让节点完全启动
4. 运行检查脚本验证合约部署
5. 如果仍然失败，使用方案 2（Sepolia 网络）

## 为什么会出现这个问题？

1. **FHEVM 插件初始化不完整** - 节点启动时插件可能没有完全初始化
2. **网络配置问题** - localhost 网络可能不支持所有 FHEVM 功能
3. **插件版本问题** - `@fhevm/hardhat-plugin@0.1.0` 可能在某些情况下无法自动部署

## 长期解决方案

考虑：
- 使用 Sepolia 测试网进行开发和测试
- 等待 FHEVM 插件更新以更好地支持 localhost
- 使用 Hardhat 内置网络（hardhat）而不是 localhost


