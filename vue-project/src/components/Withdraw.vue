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

      <div class="withdraw-form">
        <input 
          v-model="rewardValue" 
          type="number" 
          placeholder="查询最新rewardValue"
          :max="formattedUserStaked"
          min="0"
          step="0.1"
        >
        <button @click="getRewardValue" >
          {{ '提现' }}
        </button>
      </div>
      <div class="withdraw-form">
        <input 
          v-model="token1mintValue" 
          type="number" 
          placeholder="查询最新balance"
          :max="formattedUserStaked"
          min="0"
          step="0.1"
        >
        <button @click="token1mint" >
          {{ '切换后Token1,设置mint' }}
        </button>
      </div>
      <div class="withdraw-form">
        <input 
          v-model="balanceOfValue" 
          type="number" 
          placeholder="查询最新balance"
          :max="formattedUserStaked"
          min="0"
          step="0.1"
        >
        <button @click="getBalanceOf" >
          {{ '切换后balanceOf' }}
        </button>
      </div>
     
      <div class="reward-section">
        <h3>奖励信息</h3>
        <p>可领取奖励: {{ formattedUserReward }} GLD2</p>
        <p>实时累计奖励: {{ accumulatedReward.toFixed(6) }} GLD2</p>
         <!-- <p>合约原始值: {{ ethers.formatEther(rawReward) }} GLD2</p> -->
        <button @click="getReward" :disabled="isClaiming || formattedUserReward <= 0">
          {{ isClaiming ? '处理中...' : '领取奖励' }}
        </button>

        <button style="margin-left:15px;" @click="earned">
          {{ '更新奖励' }}
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
import { ref, onMounted, onUnmounted, watch  } from 'vue';
import { useStaking } from '@/composables/useStaking'; // 引入钱包连接相关的 composable（封装钱包连接、合约实例等核心逻辑）
import { useStakingStore } from '@/stores/staking'; // 引入 Pinia 状态管理（存储用户质押数据、奖励数据等全局状态）
import { storeToRefs } from 'pinia'; // 将 Pinia 状态转为响应式引用
import { ethers } from 'ethers'; // Vue 核心 API 和以太坊工具库

// 从 useStaking 获取钱包连接状态、合约实例、错误信息等
const { 
  isConnected, 
  connectWallet, 
  stakingContract,
  token1Contract,
  token2Contract,
  signer,

  currentAccount,

  rewardAmount, // 新增的响应式奖励金额
  startRewardRefresh,
  stopRewardRefresh,
  fetchReward,

  error 
} = useStaking();

// 从 Pinia 存储获取用户质押数据和奖励数据（响应式）
const stakingStore = useStakingStore();
const { 
  formattedUserStaked,
  formattedUserReward
} = storeToRefs(stakingStore);

const withdrawAmount = ref(0); // 绑定输入框的提现数量（用户输入）
const isWithdrawing = ref(false); // 提现操作的加载状态（防止重复提交）
const isClaiming = ref(false); // 领取奖励操作的加载状态
const transactionHash = ref(''); // 存储交易哈希（供用户查询区块链交易）// 领取奖励操作的加载状态

// 新增响应式变量
const accumulatedReward = ref(0); // 累计奖励
const lastUpdateTime = ref(0); // 最后更新时间戳
const rewardRate = ref(0); // 从合约读取的奖励速率

const balanceOfValue = ref(0); // 
const rewardValue = ref(0); // 
const token1mintValue = ref(0); // 

// 提现做法
const withdraw = async () => {
  try {
    isWithdrawing.value = true; // 标记提现操作开始（显示"处理中"状态）
    error.value = ''; // 清空之前的错误信息
    
    const amount = ethers.parseEther(withdrawAmount.value.toString()); // 1. 单位转换：将用户输入的可读数量（如 1.5 GLD1）转为合约可识别的 wei 单位
    const tx = await stakingContract.value.withdraw(amount); // 2. 调用质押合约的 withdraw 方法，发起提现交易
    
    transactionHash.value = tx.hash; // 3. 记录交易哈希，供用户在区块链浏览器中查询
    await tx.wait(); // 4. 等待区块链确认交易（确保交易在链上生效）
    
    // 更新数据
    // 5. 交易成功后，更新本地状态（同步最新数据）
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value); // 更新用户质押信息
    await stakingStore.updateGlobalInfo(stakingContract.value); // 更新全局质押统计
    await stakingStore.updateTokenBalances( // 更新代币余额
      token1Contract.value,
      token2Contract.value,
      currentAccount.value
    );
    
    // 6. 重置输入框（提升用户体验）
    withdrawAmount.value = 0;
  } catch (err) {
    // 捕获错误并显示（如用户拒绝交易、余额不足等）
    error.value = err.message;
  } finally {
    // 无论成功失败，结束加载状态
    isWithdrawing.value = false;
  }
  /* 
  单位转换：用户输入的是 “GLD1 数量”（如 2.5），需通过 ethers.parseEther 转为合约交互所需的最小单位（wei）。
  交易确认：tx.wait() 确保交易被区块链打包确认后再更新状态，避免本地状态与链上数据不一致。getReward
  数据同步：提现后需同步用户质押量、代币余额等数据，保证页面显示最新状态。
   */
};
// 领取奖励
const getReward = async () => {
  try {
    isClaiming.value = true; // 标记领取奖励操作开始
    error.value = ''; // 清空错误信息
    
    const tx = await stakingContract.value.getReward(); // 1. 调用质押合约的 getReward 方法，发起领取奖励交易
    
    // 2. 记录交易哈希
    transactionHash.value = tx.hash;
    await tx.wait(); // 3. 等待区块链确认交易
    
    // 更新数据
    // 4. 交易成功后更新状态（重点同步奖励数据和 GLD2 余额）
    console.log(9000, currentAccount.value)
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value); // 更新用户奖励信息
    await stakingStore.updateTokenBalances( // 更新 GLD2 余额（GLD1 余额不变，传 null 优化性能）
      null,
      token2Contract.value,
      currentAccount.value
    );
  } catch (err) {
    // 捕获错误并显示（如无奖励可领、用户拒绝交易等）
    error.value = err.message;
  } finally {
    // 结束加载状态
    isClaiming.value = false;
  }
};

// // 实时刷新获取的奖励
// const refresh = async () => { // 参数是账户地址
//   console.log(4545454, signer.value);
//   console.log(6666666, stakingContract.value);
//   const astx = await stakingContract.value.earned(signer.value.address);
//   console.log(astx);
//   // await astx();
// }




// 实时刷新奖励
const startAutoRefresh = () => {
  if (stakingContract.value && signer.value?.address) {
    startRewardRefresh(
      stakingContract.value,
      signer.value.address,
      1000 // 1秒刷新一次
    );
  }
};

// 手动刷新
const refreshReward = async () => {
  if (stakingContract.value && signer.value?.address) {
    console.log(stakingContract.value);
    console.log(currentAccount.value);
    await stakingStore.updateUserInfo(stakingContract.value, currentAccount.value); // 更新用户质押信息
    await stakingStore.updateGlobalInfo(stakingContract.value); // 更新全局质押统计
    await stakingStore.updateTokenBalances( // 更新代币余额
      token1Contract.value,
      token2Contract.value,
      currentAccount.value
    );

    console.log('进入手动刷新判断stakingContract.value',stakingContract.value);
    console.log('进入手动刷新判断signer.value.address', signer.value.address);
    await fetchReward(stakingContract.value, signer.value.address);

    const { raw, accumulated } = await fetchRewardData(); // 获取奖励的原始值及累计值
    console.log('当前奖励:', { 原始值: raw, 累计值: accumulated });
  } else {
    console.log(stakingContract.value,  signer.value?.address)
  }
};

// 获取合约数据的方法
const fetchRewardData = async () => {
  if (!stakingContract.value || !signer.value?.address) return;
  
  // 1. 获取当前已产生但未领取的奖励
  const currentEarned = await stakingContract.value.earned(signer.value.address);
  
  // 2. 获取合约全局参数
  const [rate, lastUpdate] = await Promise.all([
    stakingContract.value.rewardRate(),
    // stakingContract.value.lastUpdateTime()
  ]);
  
  rewardRate.value = ethers.formatEther(rate);
  lastUpdateTime.value = Number(lastUpdate);
  
  // 3. 计算新增奖励（基于时间差）
  const timeElapsed = Math.floor(Date.now() / 1000) - lastUpdateTime.value;
  const newReward = timeElapsed * parseFloat(rewardRate.value);
  
  // 4. 更新累计奖励（仅当有新奖励时）
  if (newReward > 0) {
    accumulatedReward.value += newReward;
  }
  
  return {
    raw: ethers.formatEther(currentEarned),
    accumulated: accumulatedReward.value
  };
};

// 实时刷新逻辑
let refreshInterval;
const startRefresh = () => {
  refreshInterval = setInterval(async () => {
    const { raw, accumulated } = await fetchRewardData();
    console.log('当前奖励:', { 原始值: raw, 累计值: accumulated });
  }, 1000);
};
// 第八步：实时获取最新的奖励
const earned = async() => {
  console.log(signer.value.address);
 const res = await stakingContract.value.earned(signer.value.address);
 console.log(res);
}
// 第十步：体现（没有参数）
const getRewardValue = async() => {
  const res = await stakingContract.value.getReward();
 console.log(res);
}

// 第九步、第十一步：查看token2 当前账户的收益余额
const getBalanceOf = async() => {
  const res = await token2Contract.value.balanceOf(signer.value.address); 
  console.log(res);
}
// 第五步
// 切换后token1  执行mint （账户地址，1000）
const token1mint = async() => {
  await token1Contract.value.mint(signer.value.address, token1mintValue.value); 
}

// 组件挂载时启动自动刷新
onMounted(() => {
  if (isConnected.value) {
    // startAutoRefresh();
  }
  // startRefresh();
});
// onUnmounted(() => clearInterval(refreshInterval));
// 监听钱包连接状态
watch(isConnected, (connected) => {
  // if (connected) {
  //   startAutoRefresh();
  // } else {
  //   stopRewardRefresh();
  // }
});
/* 
关键点：

奖励机制：质押奖励通常是按时间累积的，getReward 方法会将用户累积的 GLD2 代币转移到用户钱包。
数据优化：领取奖励仅影响 GLD2 余额，因此 updateTokenBalances 中 GLD1 合约传 null，减少不必要的链上调用。

四、模板交互逻辑
页面的 UI 交互与 JavaScript 逻辑通过响应式状态联动，核心交互规则如下：

钱包连接状态控制：
未连接钱包（!isConnected）时，显示 “连接 MetaMask 钱包” 按钮，点击触发 connectWallet。
已连接时，显示提现表单、奖励区域等核心功能。
输入框限制：
提现数量输入框的 max 属性绑定 formattedUserStaked（用户当前质押量），防止提现超过质押数量。
输入框 min="0" 和 step="0.1" 确保输入为有效正数。
按钮状态控制：
提现按钮：disabled 绑定 isWithdrawing（加载中）或 withdrawAmount <= 0（输入无效），防止无效操作。
领取奖励按钮：disabled 绑定 isClaiming（加载中）或 formattedUserReward <= 0（无奖励可领），避免无效调用。
反馈机制：
交易哈希显示：transactionHash 有值时，展示交易哈希供用户查询。
错误提示：error 有值时，显示错误信息（如 “用户拒绝交易”“无奖励可领” 等）。

五、整体业务流程
连接钱包：用户进入页面后，需先连接 MetaMask 钱包，否则无法使用提现和领奖励功能。
提现流程：
用户输入提现数量（不超过当前质押量）→ 点击 “提现” 按钮 → 触发 withdraw 函数。
发起提现交易 → 等待区块链确认 → 同步最新质押量和代币余额。
领取奖励流程：
用户看到可领取的 GLD2 奖励 → 点击 “领取奖励” 按钮 → 触发 getReward 函数。
发起领取奖励交易 → 等待确认 → 同步最新奖励数据和 GLD2 余额。
状态反馈：操作过程中显示 “处理中”，成功后更新数据，失败后显示错误原因。
总结
此 JS 逻辑完整实现了质押系统的 “提现 - 领奖励” 闭环功能，核心特点包括：

清晰的交易状态管理（加载中、成功、失败），提升用户体验。
严格的链上数据同步，确保页面显示与区块链状态一致。
针对不同操作（提现 / 领奖励）优化数据更新逻辑，减少不必要的链上调用。
通过响应式状态与模板联动，实现直观的交互反馈。

这一逻辑是质押 DApp 中用户资产操作的核心模块，直接关系到用户资产安全和使用体验，体现了区块链应用中 “链上状态优先、本地状态同步” 的设计原则。
*/
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