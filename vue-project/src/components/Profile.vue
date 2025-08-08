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