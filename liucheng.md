1. Hardhat 环境配置
1.1 项目结构
text
project-root/
├── hardhat/          # Hardhat 项目
│   ├── contracts/
│   ├── scripts/
│   ├── test/
│   └── hardhat.config.js
├── vue-project/      # Vue3 项目
│   ├── src/
│   └── ...其他Vue文件
└── package.json      # 根项目package.json
1.2 初始化 Hardhat 项目
在项目根目录下：

bash
mkdir hardhat
cd hardhat
npm init -y
npm install --save-dev hardhat
npx hardhat
选择 "Create a JavaScript project"

1.3 安装依赖
bash
npm install --save-dev @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
1.4 更新 hardhat.config.js
javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    }
  }
};
2. 合约部署脚本
2.1 创建部署脚本 hardhat/scripts/deploy.js
javascript
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // 部署 Token1
  const Token1 = await ethers.getContractFactory("Token1");
  const token1 = await Token1.deploy(ethers.utils.parseEther("1000000"));
  await token1.deployed();
  console.log("Token1 deployed to:", token1.address);

  // 部署 Token2
  const Token2 = await ethers.getContractFactory("Token2");
  const token2 = await Token2.deploy(ethers.utils.parseEther("1000000"));
  await token2.deployed();
  console.log("Token2 deployed to:", token2.address);

  // 部署 StakingRewards
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(token1.address, token2.address);
  await staking.deployed();
  console.log("StakingRewards deployed to:", staking.address);

  // 转移一些 Token2 到 Staking 合约作为奖励
  await token2.transfer(staking.address, ethers.utils.parseEther("100000"));
  console.log("Transferred 100000 Token2 to Staking contract");

  // 设置奖励持续时间 (7天)
  await staking.setRewardsDuration(7 * 24 * 60 * 60);
  
  // 通知奖励数量
  await staking.notifyRewardAmount(ethers.utils.parseEther("10000"));

  // 保存部署信息到前端可以访问的文件
  const fs = require("fs");
  const contractsDir = __dirname + "/../vue-project/src/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({
      Token1: token1.address,
      Token2: token2.address,
      StakingRewards: staking.address
    }, undefined, 2)
  );

  const Token1Artifact = artifacts.readArtifactSync("Token1");
  const Token2Artifact = artifacts.readArtifactSync("Token2");
  const StakingRewardsArtifact = artifacts.readArtifactSync("StakingRewards");

  fs.writeFileSync(
    contractsDir + "/Token1.json",
    JSON.stringify(Token1Artifact, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/Token2.json",
    JSON.stringify(Token2Artifact, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/StakingRewards.json",
    JSON.stringify(StakingRewardsArtifact, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
2.2 运行部署脚本
bash
npx hardhat node
# 在新终端中
npx hardhat run scripts/deploy.js --network localhost
3. Vue3 前端实现
3.1 项目结构
text
src/
├── assets/
├── components/
│   ├── Dashboard.vue    # 全局数据展示
│   ├── Stake.vue       # 质押页面
│   ├── Withdraw.vue    # 提现页面
│   └── Profile.vue     # 个人信息页面
├── composables/
│   └── useStaking.js   # 共享逻辑
├── contracts/          # 由部署脚本生成
├── router/
│   └── index.js        # 路由配置
├── stores/
│   └── staking.js      # Pinia 状态管理
├── App.vue
└── main.js
3.2 安装 Vue 依赖
bash
npm install pinia ethers @metamask/detect-provider
3.3 创建共享逻辑 composables/useStaking.js
javascript
import { ref, onMounted } from 'vue';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import StakingRewards from '@/contracts/StakingRewards.json';
import Token1 from '@/contracts/Token1.json';
import Token2 from '@/contracts/Token2.json';
import contractAddresses from '@/contracts/contract-addresses.json';

export function useStaking() {
  const provider = ref(null);
  const signer = ref(null);
  const stakingContract = ref(null);
  const token1Contract = ref(null);
  const token2Contract = ref(null);
  const isConnected = ref(false);
  const currentAccount = ref('');
  const networkId = ref('');
  const error = ref('');
  
  // 初始化以太坊提供者
  const initEthereum = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();
      
      if (ethereumProvider) {
        provider.value = new ethers.BrowserProvider(ethereumProvider);
        
        // 监听账户变化
        ethereumProvider.on('accountsChanged', (accounts) => {
          currentAccount.value = accounts[0] || '';
          if (!accounts[0]) isConnected.value = false;
        });
        
        // 监听链变化
        ethereumProvider.on('chainChanged', (chainId) => {
          window.location.reload();
        });
        
        return true;
      } else {
        error.value = 'Please install MetaMask!';
        return false;
      }
    } catch (err) {
      error.value = err.message;
      return false;
    }
  };
  
  // 连接钱包
  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      signer.value = await provider.value.getSigner();
      currentAccount.value = await signer.value.getAddress();
      networkId.value = await window.ethereum.request({ method: 'eth_chainId' });
      
      // 初始化合约
      stakingContract.value = new ethers.Contract(
        contractAddresses.StakingRewards,
        StakingRewards.abi,
        signer.value
      );
      
      token1Contract.value = new ethers.Contract(
        contractAddresses.Token1,
        Token1.abi,
        signer.value
      );
      
      token2Contract.value = new ethers.Contract(
        contractAddresses.Token2,
        Token2.abi,
        signer.value
      );
      
      isConnected.value = true;
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    }
  };
  
  // 检查是否已连接
  const checkConnected = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      return await connectWallet();
    }
    return false;
  };
  
  // 初始化
  onMounted(async () => {
    await initEthereum();
    await checkConnected();
  });
  
  return {
    provider,
    signer,
    stakingContract,
    token1Contract,
    token2Contract,
    isConnected,
    currentAccount,
    networkId,
    error,
    connectWallet,
    checkConnected
  };
}
3.4 创建 Pinia 存储 stores/staking.js
javascript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ethers } from 'ethers';

export const useStakingStore = defineStore('staking', () => {
  const userStakedAmount = ref(0);
  const userRewardAmount = ref(0);
  const totalStaked = ref(0);
  const rewardRate = ref(0);
  const rewardDuration = ref(0);
  const token1Balance = ref(0);
  const token2Balance = ref(0);
  
  // 计算属性
  const formattedUserStaked = computed(() => {
    return ethers.formatEther(userStakedAmount.value);
  });
  
  const formattedUserReward = computed(() => {
    return ethers.formatEther(userRewardAmount.value);
  });
  
  const formattedTotalStaked = computed(() => {
    return ethers.formatEther(totalStaked.value);
  });
  
  // 更新用户信息
  async function updateUserInfo(stakingContract, address) {
    if (!stakingContract || !address) return;
    
    userStakedAmount.value = await stakingContract.balanceOf(address);
    userRewardAmount.value = await stakingContract.earned(address);
  }
  
  // 更新全局信息
  async function updateGlobalInfo(stakingContract) {
    if (!stakingContract) return;
    
    totalStaked.value = await stakingContract.totalSupply();
    rewardRate.value = await stakingContract.rewardRate();
    rewardDuration.value = await stakingContract.duration();
  }
  
  // 更新代币余额
  async function updateTokenBalances(token1Contract, token2Contract, address) {
    if (!token1Contract || !token2Contract || !address) return;
    
    token1Balance.value = await token1Contract.balanceOf(address);
    token2Balance.value = await token2Contract.balanceOf(address);
  }
  
  return {
    userStakedAmount,
    userRewardAmount,
    totalStaked,
    rewardRate,
    rewardDuration,
    token1Balance,
    token2Balance,
    formattedUserStaked,
    formattedUserReward,
    formattedTotalStaked,
    updateUserInfo,
    updateGlobalInfo,
    updateTokenBalances
  };
});
3.5 创建路由 router/index.js
javascript
import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '@/components/Dashboard.vue';
import Stake from '@/components/Stake.vue';
import Withdraw from '@/components/Withdraw.vue';
import Profile from '@/components/Profile.vue';

const routes = [
  { path: '/', component: Dashboard },
  { path: '/stake', component: Stake },
  { path: '/withdraw', component: Withdraw },
  { path: '/profile', component: Profile }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
3.6 创建组件
Dashboard.vue
vue
<template>
  <div class="dashboard">
    <h2>质押系统概览</h2>
    
    <div v-if="!isConnected">
      <button @click="connectWallet">连接MetaMask钱包</button>
    </div>
    
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>我的质押数量</h3>
          <p>{{ formattedUserStaked }} GLD1</p>
        </div>
        
        <div class="stat-card">
          <h3>我的奖励</h3>
          <p>{{ formattedUserReward }} GLD2</p>
        </div>
        
        <div class="stat-card">
          <h3>总质押量</h3>
          <p>{{ formattedTotalStaked }} GLD1</p>
        </div>
        
        <div class="stat-card">
          <h3>奖励速率</h3>
          <p>{{ ethers.formatEther(rewardRate) }} GLD2/秒</p>
        </div>
      </div>
      
      <div class="actions">
        <router-link to="/stake" class="action-button">前往质押</router-link>
        <router-link to="/withdraw" class="action-button">前往提现</router-link>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup>
import { useStaking } from '@/composables/useStaking';
import { useStakingStore } from '@/stores/staking';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';
import { ethers } from 'ethers';

const { 
  isConnected, 
  currentAccount, 
  connectWallet, 
  stakingContract,
  token1Contract,
  token2Contract,
  error 
} = useStaking();

const stakingStore = useStakingStore();
const { 
  formattedUserStaked,
  formattedUserReward,
  formattedTotalStaked,
  rewardRate
} = storeToRefs(stakingStore);

const updateData = async () => {
  if (stakingContract.value && currentAccount.value) {
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value);
    await stakingStore.updateGlobalInfo(stakingContract.value);
    await stakingStore.updateTokenBalances(
      token1Contract.value,
      token2Contract.value,
      currentAccount.value
    );
  }
};

onMounted(async () => {
  if (isConnected.value) {
    await updateData();
  }
});
</script>

<style scoped>
.dashboard {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 30px 0;
}

.stat-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.stat-card h3 {
  margin-top: 0;
  color: #666;
}

.stat-card p {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 0;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 40px;
}

.action-button {
  padding: 12px 24px;
  background-color: #42b983;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
}

.action-button:hover {
  background-color: #369f6b;
}

.error-message {
  color: red;
  margin-top: 20px;
}
</style>
Stake.vue
vue
<template>
  <div class="stake-page">
    <h2>质押 GLD1 代币</h2>
    
    <div v-if="!isConnected">
      <button @click="connectWallet">连接MetaMask钱包</button>
    </div>
    
    <div v-else>
      <div class="balance-info">
        <p>当前 GLD1 余额: {{ ethers.formatEther(token1Balance) }}</p>
      </div>
      
      <div class="stake-form">
        <input 
          v-model="stakeAmount" 
          type="number" 
          placeholder="输入质押数量"
          :max="ethers.formatEther(token1Balance)"
          min="0"
          step="0.1"
        >
        <button @click="approveToken1" :disabled="isApproving">
          {{ isApproving ? '处理中...' : '批准' }}
        </button>
        <button @click="stake" :disabled="isStaking || stakeAmount <= 0">
          {{ isStaking ? '处理中...' : '质押' }}
        </button>
      </div>
      
      <div v-if="approvalNeeded" class="approval-notice">
        <p>请注意: 您需要先批准合约使用您的 GLD1 代币</p>
      </div>
      
      <div v-if="transactionHash" class="transaction-info">
        <p>交易哈希: {{ transactionHash }}</p>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <router-link to="/" class="back-link">返回仪表盘</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useStaking } from '@/composables/useStaking';
import { useStakingStore } from '@/stores/staking';
import { storeToRefs } from 'pinia';
import { ethers } from 'ethers';

const { 
  isConnected, 
  currentAccount, 
  connectWallet, 
  stakingContract,
  token1Contract,
  error 
} = useStaking();

const stakingStore = useStakingStore();
const { token1Balance } = storeToRefs(stakingStore);

const stakeAmount = ref(0);
const isApproving = ref(false);
const isStaking = ref(false);
const transactionHash = ref('');
const approvalNeeded = ref(false);

const checkAllowance = async () => {
  if (!token1Contract.value || !currentAccount.value || !stakingContract.value) return;
  
  const allowance = await token1Contract.value.allowance(
    currentAccount.value,
    stakingContract.value.address
  );
  
  approvalNeeded.value = allowance <= 0;
};

const approveToken1 = async () => {
  try {
    isApproving.value = true;
    error.value = '';
    
    const tx = await token1Contract.value.approve(
      stakingContract.value.address,
      ethers.MaxUint256
    );
    
    transactionHash.value = tx.hash;
    await tx.wait();
    approvalNeeded.value = false;
  } catch (err) {
    error.value = err.message;
  } finally {
    isApproving.value = false;
  }
};

const stake = async () => {
  try {
    isStaking.value = true;
    error.value = '';
    
    const amount = ethers.parseEther(stakeAmount.value.toString());
    const tx = await stakingContract.value.stake(amount);
    
    transactionHash.value = tx.hash;
    await tx.wait();
    
    // 更新数据
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value);
    await stakingStore.updateGlobalInfo(stakingContract.value);
    await stakingStore.updateTokenBalances(
      token1Contract.value,
      null,
      currentAccount.value
    );
    
    stakeAmount.value = 0;
  } catch (err) {
    error.value = err.message;
  } finally {
    isStaking.value = false;
  }
};

watch([isConnected, token1Contract, stakingContract], () => {
  checkAllowance();
});
</script>

<style scoped>
.stake-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.balance-info {
  margin: 20px 0;
  font-size: 18px;
}

.stake-form {
  display: flex;
  gap: 10px;
  margin: 30px 0;
}

.stake-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.stake-form button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.stake-form button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.approval-notice {
  color: #e67e22;
  margin: 20px 0;
}

.transaction-info {
  margin: 20px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  word-break: break-all;
}

.error-message {
  color: red;
  margin: 20px 0;
}

.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #42b983;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
Withdraw.vue
vue
<template>
  <div class="withdraw-page">
    <h2>提现 GLD1 代币</h2>
    
    <div v-if="!isConnected">
      <button @click="connectWallet">连接MetaMask钱包</button>
    </div>
    
    <div v-else>
      <div class="balance-info">
        <p>当前质押数量: {{ formattedUserStaked }} GLD1</p>
      </div>
      
      <div class="withdraw-form">
        <input 
          v-model="withdrawAmount" 
          type="number" 
          placeholder="输入提现数量"
          :max="formattedUserStaked"
          min="0"
          step="0.1"
        >
        <button @click="withdraw" :disabled="isWithdrawing || withdrawAmount <= 0">
          {{ isWithdrawing ? '处理中...' : '提现' }}
        </button>
      </div>
      
      <div class="reward-section">
        <h3>奖励信息</h3>
        <p>可领取奖励: {{ formattedUserReward }} GLD2</p>
        <button @click="getReward" :disabled="isClaiming || formattedUserReward <= 0">
          {{ isClaiming ? '处理中...' : '领取奖励' }}
        </button>
      </div>
      
      <div v-if="transactionHash" class="transaction-info">
        <p>交易哈希: {{ transactionHash }}</p>
      </div>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>
      
      <router-link to="/" class="back-link">返回仪表盘</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useStaking } from '@/composables/useStaking';
import { useStakingStore } from '@/stores/staking';
import { storeToRefs } from 'pinia';
import { ethers } from 'ethers';

const { 
  isConnected, 
  connectWallet, 
  stakingContract,
  token1Contract,
  token2Contract,
  error 
} = useStaking();

const stakingStore = useStakingStore();
const { 
  formattedUserStaked,
  formattedUserReward
} = storeToRefs(stakingStore);

const withdrawAmount = ref(0);
const isWithdrawing = ref(false);
const isClaiming = ref(false);
const transactionHash = ref('');

const withdraw = async () => {
  try {
    isWithdrawing.value = true;
    error.value = '';
    
    const amount = ethers.parseEther(withdrawAmount.value.toString());
    const tx = await stakingContract.value.withdraw(amount);
    
    transactionHash.value = tx.hash;
    await tx.wait();
    
    // 更新数据
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value);
    await stakingStore.updateGlobalInfo(stakingContract.value);
    await stakingStore.updateTokenBalances(
      token1Contract.value,
      token2Contract.value,
      currentAccount.value
    );
    
    withdrawAmount.value = 0;
  } catch (err) {
    error.value = err.message;
  } finally {
    isWithdrawing.value = false;
  }
};

const getReward = async () => {
  try {
    isClaiming.value = true;
    error.value = '';
    
    const tx = await stakingContract.value.getReward();
    
    transactionHash.value = tx.hash;
    await tx.wait();
    
    // 更新数据
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value);
    await stakingStore.updateTokenBalances(
      null,
      token2Contract.value,
      currentAccount.value
    );
  } catch (err) {
    error.value = err.message;
  } finally {
    isClaiming.value = false;
  }
};
</script>

<style scoped>
.withdraw-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.balance-info {
  margin: 20px 0;
  font-size: 18px;
}

.withdraw-form {
  display: flex;
  gap: 10px;
  margin: 30px 0;
}

.withdraw-form input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.withdraw-form button {
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.withdraw-form button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.reward-section {
  margin: 40px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.reward-section h3 {
  margin-top: 0;
}

.reward-section p {
  font-size: 18px;
  margin: 10px 0;
}

.reward-section button {
  padding: 10px 20px;
  background-color: #e67e22;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reward-section button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.transaction-info {
  margin: 20px 0;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  word-break: break-all;
}

.error-message {
  color: red;
  margin: 20px 0;
}

.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #42b983;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
Profile.vue
vue
<template>
  <div class="profile-page">
    <h2>个人信息</h2>
    
    <div v-if="!isConnected">
      <button @click="connectWallet">连接MetaMask钱包</button>
    </div>
    
    <div v-else>
      <div class="wallet-info">
        <h3>钱包地址</h3>
        <p>{{ currentAccount }}</p>
      </div>
      
      <div class="token-balances">
        <div class="balance-card">
          <h4>GLD1 余额</h4>
          <p>{{ ethers.formatEther(token1Balance) }} GLD1</p>
        </div>
        
        <div class="balance-card">
          <h4>GLD2 余额</h4>
          <p>{{ ethers.formatEther(token2Balance) }} GLD2</p>
        </div>
      </div>
      
      <div class="staking-info">
        <h3>质押信息</h3>
        <p>质押数量: {{ formattedUserStaked }} GLD1</p>
        <p>待领取奖励: {{ formattedUserReward }} GLD2</p>
      </div>
      
      <button @click="refreshData" class="refresh-button">刷新数据</button>
      
      <router-link to="/" class="back-link">返回仪表盘</router-link>
    </div>
  </div>
</template>

<script setup>
import { useStaking } from '@/composables/useStaking';
import { useStakingStore } from '@/stores/staking';
import { storeToRefs } from 'pinia';
import { ethers } from 'ethers';

const { 
  isConnected, 
  currentAccount, 
  connectWallet, 
  stakingContract,
  token1Contract,
  token2Contract
} = useStaking();

const stakingStore = useStakingStore();
const { 
  formattedUserStaked,
  formattedUserReward,
  token1Balance,
  token2Balance
} = storeToRefs(stakingStore);

const refreshData = async () => {
  await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value);
  await stakingStore.updateGlobalInfo(stakingContract.value);
  await stakingStore.updateTokenBalances(
    token1Contract.value,
    token2Contract.value,
    currentAccount.value
  );
};
</script>

<style scoped>
.profile-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

.wallet-info h3, .staking-info h3 {
  margin-top: 30px;
}

.wallet-info p {
  word-break: break-all;
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
}

.token-balances {
  display: flex;
  gap: 20px;
  margin: 30px 0;
}

.balance-card {
  flex: 1;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
  text-align: center;
}

.balance-card h4 {
  margin-top: 0;
  color: #666;
}

.balance-card p {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 0;
}

.staking-info p {
  font-size: 18px;
  margin: 10px 0;
}

.refresh-button {
  display: block;
  margin: 30px auto;
  padding: 10px 20px;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.back-link {
  display: inline-block;
  margin-top: 20px;
  color: #42b983;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}
</style>
3.7 更新 App.vue
vue
<template>
  <header>
    <nav>
      <router-link to="/">仪表盘</router-link>
      <router-link to="/stake">质押</router-link>
      <router-link to="/withdraw">提现</router-link>
      <router-link to="/profile">个人信息</router-link>
    </nav>
  </header>
  
  <router-view />
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  margin-bottom: 40px;
}

nav {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

nav a {
  color: #2c3e50;
  text-decoration: none;
  font-weight: bold;
  padding: 10px;
  border-radius: 4px;
}

nav a.router-link-exact-active {
  color: white;
  background-color: #42b983;
}
</style>
3.8 更新 main.js
javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
4. 本地联调步骤
启动本地区块链节点:

bash
cd hardhat
npx hardhat node
部署合约 (在新终端中):

bash
cd hardhat
npx hardhat run scripts/deploy.js --network localhost
启动Vue开发服务器 (在新终端中):

bash
cd vue-project
npm run dev
配置MetaMask:

网络名称: Hardhat

RPC URL: http://127.0.0.1:8545

链ID: 1337

货币符号: ETH

导入测试账户:

从Hardhat节点启动时的输出中复制私钥

在MetaMask中导入账户

开始测试:

访问 http://localhost:5173

连接MetaMask钱包

测试质押、提现和奖励领取功能

5. 功能说明
Dashboard: 显示全局数据和用户质押/奖励概览

Stake: 质押Token1 (需要先批准合约)

Withdraw: 提现Token1和领取Token2奖励

Profile: 显示用户详细信息和代币余额

这个实现提供了完整的质押系统前端和本地开发环境，你可以根据需要进一步扩展和定制。
