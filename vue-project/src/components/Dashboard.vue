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