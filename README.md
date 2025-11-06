# 🎰 Draw Lottery - FHE 加密摇号系统

Draw Lottery 是一个基�?**FHEVM（Fully Homomorphic Encryption Virtual Machine�?* 的去中心化摇号平台。参与者支�?0.001 ETH 进行“摇号”，系统会将得到的六位数号码加密后上链，直到管理员关闭轮次并开奖前都无法被窥探。开奖时合约生成随机中奖号码，参与者再通过私钥在本地解密以验证是否中奖，确保全程公平、透明且隐私可控�?
![License](https://img.shields.io/badge/license-BSD--3--Clause--Clear-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-green.svg)
![Solidity](https://img.shields.io/badge/solidity-0.8.24-orange.svg)

## �?核心亮点

- **多轮次抽�?*：管理员可随时关闭当前频道、开奖并开启下一轮，支持长期运营�?- **加密号码存证**：每一次摇号都�?`euint32` 加密方式写入链上，仅号码拥有者可后续解密�?- **链上收费约束**：摇号费�?0.001 ETH 写入合约逻辑，防止恶意刷号�?- **管理员操作面�?*：关闭轮次、开奖、新开一轮一键完成，并实时查看参与数据�?- **号码解码工作�?*：可订阅链上事件、查询历史摇号记录、协助参与者解密、统计中奖情况�?- **RainbowKit + Wagmi**：完善的钱包连接体验，支持本�?31337 �?Sepolia 测试网�?
## 🗂�?目录结构

```
secret-vote-box-main/
├── contracts/
�?  └── DrawLottery.sol         # FHE 加密摇号合约
├── deploy/
�?  └── deploy.ts               # hardhat-deploy 脚本
├── test/
�?  └── DrawLottery.ts          # 使用 mock FHEVM 的单元测�?├── types/                      # TypeChain 生成的类型定�?├── ui/
�?  ├── src/
�?  �?  ├── components/         # 前端核心组件（DrawApp、ShakeButton、AdminPanel 等）
�?  �?  ├── config/             # 合约地址、Wagmi 配置
�?  �?  ├── hooks/              # FHE Relayer 实例�?Hook
�?  �?  ├── services/           # 加密/解密工具
�?  �?  ├── App.tsx             # RainbowKit + QueryClient 集成入口
�?  �?  └── main.tsx            # Vite 启动入口
�?  └── public/                 # logo、favicon 等静态资�?├── hardhat.config.ts           # Hardhat 主配�?└── README.md
```

## 🔧 智能合约功能概览

- `shake(externalEuint32 encryptedNumber, bytes inputProof)`  
  参与者支�?0.001 ETH 摇号，将外部加密好的六位数写�?`_userNumbers`�?- `closeRound()` / `drawWinningNumber()` / `startNewRound()`  
  仅管理员可调用，分别用于关闭当前轮次、生成中奖号码、开启下一轮�?- `checkWin(round, shakeIndex)`  
  使用 FHE 等式比较返回加密布尔值，参与者解密后即可得知是否中奖�?- `getParticipants` / `getTotalShakes` / `getUserShakeCount`  
  公开查询轮次参与数据与个人次数，方便前端展示�?
## 🧪 测试与调�?
1. 安装依赖并编�?
```bash
npm install
   npm run compile      # 生成 artifacts �?TypeChain
```

2. 运行单元测试（需�?Hardhat FHE mock 环境�?
```bash
   npm test
```

3. 启动本地链并部署

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

4. 更新前端合约地址（如需�? 
   将部署结果写�?`ui/src/config/contracts.ts` 对应字段�?
## 💻 前端启动

```bash
cd ui
npm install
npm run dev          # http://localhost:5173 默认端口
```

### 前端主要模块

- `DrawApp`：头部信息卡、摇号面板、管理员面板、解码工作台统一布局�?- `ShakeButton`：调�?FHE SDK 加密随机六位数并发送合约交易，展示费用与调试信息�?- `ResultDisplay`：读取最新摇号句柄，触发本地解密，对比中奖号码�?- `ParticipantsDecoder`：监�?`NumberShaken` 事件、按需解密、展示中奖者模态框�?- `useZamaInstance`：根据链 ID 自动初始化本�?mock / Zama relayer SDK�?
## 🌐 网络支持

- **Localhost (31337)**：依�?`@fhevm/hardhat-plugin` 提供�?mock relayer，无需额外服务�?- **Sepolia (11155111)**：使�?`https://relayer.testnet.zama.cloud`，请准备测试�?ETH�?- `VITE_WALLETCONNECT_PROJECT_ID`：可�?`ui/.env.local` 配置真实项目 ID，未配置则使用演�?ID�?
## 🛡�?最佳实�?
- 不要提交私钥，使�?Hardhat `vars` 或环境变量管理敏感信息�?- 摇号费用、中奖逻辑与随机源全部写在合约内，提交 PR 前务必跑通测试�?- 前端解密需要参与者钱包签名生�?EIP-712 授权，确保浏览器已连接正确地址�?
## 📄 许可�?
本仓库继承模版的 **BSD-3-Clause-Clear** 许可协议，详�?[LICENSE](LICENSE)�?
---

如需进一步集成或二次开发，欢迎�?Issues 中讨论或提交 Pull Request。祝使用愉快，摇号好运！ 🎉
