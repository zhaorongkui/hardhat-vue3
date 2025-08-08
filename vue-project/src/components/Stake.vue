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