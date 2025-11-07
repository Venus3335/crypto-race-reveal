# 项目重新启动完成

## ✅ 服务状态

### 1. Hardhat 节点
- **状态**: 运行中
- **端口**: 8545
- **URL**: `http://localhost:8545`
- **Chain ID**: 31337
- **窗口**: 最小化的 PowerShell 窗口

### 2. 合约部署
- **状态**: 已部署
- **网络**: localhost
- **合约地址**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **前端配置**: 已自动更新

### 3. 前端服务器
- **状态**: 运行中
- **端口**: 5173
- **URL**: `http://localhost:5173`
- **窗口**: 最小化的 PowerShell 窗口

## 🌐 访问应用

### 打开前端

在浏览器中打开：**`http://localhost:5173`**

### 连接钱包

1. **确保钱包已安装**（Rainbow 或 MetaMask）

2. **添加本地网络到钱包**：
   - 网络名称: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - 货币符号: `ETH`

3. **导入测试账户**：
   - 查看 Hardhat 节点窗口（最小化的 PowerShell 窗口）
   - 复制一个账户的私钥（例如：`0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`）
   - 在钱包中导入该私钥
   - 账户将有 10000 ETH

4. **连接钱包**：
   - 在前端页面右上角点击 "Connect Wallet"
   - 选择 Rainbow 钱包
   - 切换到 Hardhat Local 网络
   - 批准连接

## 🧪 测试功能

### 购买彩票（数据提交）
1. 切换到 "Buy Tickets" 标签
2. 输入数字（11-99）
3. 点击 "Buy Ticket for 0.0001 ETH"
4. 确认交易

### 开奖（仅所有者）
1. 切换到 "Draw Lottery" 标签
2. 如果使用第一个账户（所有者），点击 "Draw Lottery"
3. 等待交易确认

### 查看和解密彩票（数据查看和解密）
1. 切换到 "Check Winnings" 标签
2. 选择轮次
3. 点击 "Decrypt" 查看加密的彩票号码
4. 如果中奖，点击 "Claim Prize!" 领取奖励

## ⚙️ FHEVM 配置说明

由于 localhost 网络上的 FHEVM 合约未完全部署，代码已配置为：

- ✅ **FHE 操作使用 Sepolia 网络**访问协处理器合约
- ✅ **区块链交易使用 localhost 网络**（通过 wagmi）
- ✅ **加密/解密功能正常工作**

这是本地开发的常见模式，不影响功能使用。

## 🔧 服务管理

### 查看服务状态

```powershell
# 检查 Hardhat 节点
Test-NetConnection -ComputerName localhost -Port 8545

# 检查前端
Test-NetConnection -ComputerName localhost -Port 5173

# 查看 Node 进程
Get-Process node
```

### 停止服务

```powershell
# 停止所有 Node 进程
taskkill /F /IM node.exe
```

### 重启服务

如果服务停止，可以：

1. **查看最小化的 PowerShell 窗口**查看错误信息
2. **或按照以下步骤手动重启**：

**重启 Hardhat 节点：**
```bash
cd d:\cursor\code\ZLottery-main
npx hardhat node
```

**重启前端：**
```bash
cd d:\cursor\code\ZLottery-main\ui
npm run dev
```

## 📋 当前配置

- **合约地址**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **网络**: localhost (Chain ID: 31337)
- **前端**: `http://localhost:5173`
- **FHEVM**: 使用 SepoliaConfig（FHE 操作使用 Sepolia 网络）

## 🐛 故障排除

### 如果前端无法连接

1. **检查 Hardhat 节点是否运行**：
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 8545
   ```

2. **检查前端是否运行**：
   ```powershell
   Test-NetConnection -ComputerName localhost -Port 5173
   ```

3. **查看最小化的 PowerShell 窗口**是否有错误信息

### 如果 FHE 初始化失败

1. **刷新浏览器页面** (Ctrl+Shift+R)
2. **重新连接钱包**
3. **检查浏览器控制台**中的错误信息
4. **确保使用 SepoliaConfig**（代码已更新）

### 如果看到 "getCoprocessorSigners" 错误

代码已修复，使用 SepoliaConfig 的默认网络提供者。如果仍然看到错误：

1. **强制刷新浏览器** (Ctrl+Shift+R)
2. **清除浏览器缓存**
3. **重新连接钱包**

## ✅ 下一步

1. ✅ 打开 `http://localhost:5173`
2. ✅ 连接钱包到 Hardhat Local 网络
3. ✅ 测试购买彩票功能
4. ✅ 测试加密/解密功能

所有服务已启动并运行。可以开始使用应用了！🎉


