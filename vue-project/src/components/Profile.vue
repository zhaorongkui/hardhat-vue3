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
/* 二、核心数据解析
页面展示的核心数据均来自 Pinia 状态管理和 useStaking 组合函数，具体包括：

钱包基础信息：
isConnected：钱包是否已连接（控制页面显示状态）
currentAccount：当前连接的钱包地址（用户唯一标识）
代币余额数据：
token1Balance：用户的 GLD1 代币余额（原始 wei 单位，需格式化后展示）
token2Balance：用户的 GLD2 代币余额（原始 wei 单位）
质押相关数据：
formattedUserStaked：用户已质押的 GLD1 数量（已格式化，可直接展示）
formattedUserReward：用户待领取的 GLD2 奖励（已格式化） */


import { useStaking } from '@/composables/useStaking'; // 引入钱包连接相关的 composable（封装了钱包连接状态、合约实例等核心逻辑）
import { useStakingStore } from '@/stores/staking'; // 引入 Pinia 状态管理（存储用户资产数据、质押信息等全局状态）
import { storeToRefs } from 'pinia'; // 将 Pinia 状态转为响应式引用，便于在模板中使用
import { ethers } from 'ethers'; // 引入以太坊工具库（用于格式化代币数量）

const { 
  isConnected, 
  currentAccount, 
  connectWallet, 
  stakingContract,
  token1Contract,
  token2Contract
} = useStaking(); // 从 useStaking 获取钱包连接状态、当前账户地址、合约实例等

const stakingStore = useStakingStore(); // 从 Pinia 存储获取用户资产和质押相关的响应式数据
const { 
  formattedUserStaked,
  formattedUserReward,
  token1Balance,
  token2Balance
} = storeToRefs(stakingStore);

const refreshData = async () => {
  // 调用 Pinia 存储中的方法，从链上同步最新数据
  await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value); // 更新用户质押信息（质押量、待领奖励）
  await stakingStore.updateGlobalInfo(stakingContract.value); // 更新全局质押数据（可选，确保数据一致性）
  await stakingStore.updateTokenBalances( // 更新两种代币的余额
    token1Contract.value,
    token2Contract.value,
    currentAccount.value
  );
};

/* 
四、页面交互逻辑
页面的 UI 交互与 JavaScript 逻辑通过响应式状态联动，核心规则如下：

钱包连接状态控制：
未连接钱包（!isConnected）时，仅显示 “连接 MetaMask 钱包” 按钮，点击触发 connectWallet 方法。
已连接时，展示完整的个人信息（钱包地址、余额、质押数据等）。
数据展示规则：
钱包地址直接展示 currentAccount（区块链账户唯一标识）。
GLD1/GLD2 余额通过 ethers.formatEther 将原始 wei 单位转换为可读的代币数量（如将 1000000000000000000 转换为 1.0）。
质押数据（formattedUserStaked 和 formattedUserReward）已在状态管理中完成格式化，可直接展示。
手动刷新功能：
点击 “刷新数据” 按钮触发 refreshData 函数，重新从链上获取最新数据。
解决数据未自动同步的问题（如链上交易确认后页面未及时更新）。
五、整体业务流程
页面加载：
初始化时通过 useStaking 检查钱包连接状态。
若已连接，自动从 Pinia 状态中读取并展示用户数据（这些数据通常在钱包连接时已初始化）。
用户操作：
未连接钱包：用户点击 “连接 MetaMask 钱包”，完成连接后自动展示个人信息。
已连接钱包：用户可查看钱包地址、代币余额、质押数据，点击 “刷新数据” 更新最新状态。
数据流转：
页面展示的数据均来自 Pinia 全局状态，确保各页面数据一致性。
刷新数据时，通过调用状态管理的方法从区块链合约中读取最新数据，更新到全局状态，页面通过响应式自动同步展示。
总结
个人中心页面的 JS 逻辑是一个数据展示与同步的核心模块，其设计特点包括：

依赖全局状态管理（Pinia），确保数据在各页面间的一致性。
通过响应式状态自动同步页面展示，减少手动操作。
提供手动刷新功能，解决区块链数据更新延迟问题。
清晰分离数据来源（钱包连接状态、合约实例、全局状态），逻辑简洁明了。

该页面作为用户查看个人资产和质押状态的 “仪表盘”，核心价值在于提供准确、实时的链上数据展示，同时通过简洁的交互提升用户体验。
 */
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