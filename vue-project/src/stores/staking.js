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