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