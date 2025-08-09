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
  isConnected, // 钱包连接状态
  currentAccount, // 当前账户地址
  connectWallet, // 连接钱包的方法
  stakingContract, // 三个智能合约实例 stakingContract 质押合约、
  token1Contract, //token1Contract 代币合约
  token2Contract, //token2Contract 代币合约
  error
} = useStaking();

const stakingStore = useStakingStore(); // piner 工具库
const {
  formattedUserStaked,
  formattedUserReward,
  formattedTotalStaked,
  rewardRate
} = storeToRefs(stakingStore);

const updateData = async () => {
  // 检查合约实例和当前账户是否有效
  if (stakingContract.value && currentAccount.value) {
    // 更新用户质押相关信息
    await stakingStore.updateUserInfo(
      stakingContract.value,
      currentAccount.value
    );
    // 更新全局质押统计信息
    await stakingStore.updateGlobalInfo(stakingContract.value);
    // 更新用户的两种代币余额
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
// 整体业务流程
// 页面加载时，先通过 useStaking 检查钱包连接状态
// 如果已连接，在组件挂载后自动调用 updateData() 从区块链获取数据
// updateData() 通过调用 Pinia 存储中的方法，将链上数据同步到前端状态
// 模板中通过响应式状态展示用户质押数量、可领取奖励、总质押量等关键信息
// 提供连接钱包的入口和跳转到质押 / 提现页面的导航

// 这个逻辑实现了区块链 DApp 中常见的 "数据展示 - 状态管理 - 链上交互" 的分层架构，将数据获取和状态管理分离，使代码更清晰、可维护。
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
