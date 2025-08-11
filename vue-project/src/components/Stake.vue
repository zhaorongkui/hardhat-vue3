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
        />
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
import { useStaking } from '@/composables/useStaking'; // 引入钱包连接相关的 composable（封装了钱包连接、合约实例等）
import { useStakingStore } from '@/stores/staking'; // 引入 Pinia 状态管理（存储代币余额等全局状态）
import { storeToRefs } from 'pinia'; // 将 Pinia 状态转为响应式引用
import { ethers } from 'ethers'; // Vue 核心 API 和以太坊工具库

const {
  isConnected,
  currentAccount,
  connectWallet,
  stakingContract,
  token1Contract,
  error
} = useStaking(); // 从 useStaking 获取钱包连接状态、合约实例等

const stakingStore = useStakingStore(); // 从 Pinia 存储获取 GLD1 代币余额（响应式）
const { token1Balance } = storeToRefs(stakingStore);

const stakeAmount = ref(0); // 绑定输入框的质押数量（用户输入）
const isApproving = ref(false); // 批准操作的加载状态（防止重复提交）
const isStaking = ref(false); // 质押操作的加载状态
const transactionHash = ref(''); // 存储交易哈希（供用户查询交易）
const approvalNeeded = ref(false); // 标记是否需要批准代币使用权限（ERC20 机制）

const checkAllowance = async () => {
  // 确保合约实例和账户地址有效
  if (!token1Contract.value || !currentAccount.value || !stakingContract.value)
    return;

  // 调用 ERC20 标准方法 allowance：查询用户批准给质押合约的代币额度
  const allowance = await token1Contract.value.allowance(
    currentAccount.value,
    stakingContract.value.address
  );
  // 如果批准额度 ≤ 0，则标记需要批准
  approvalNeeded.value = allowance <= 0;
};

// 批准事件，当质押的数量为负数时得需要批准
const approveToken1 = async () => {
  // 当 approvalNeeded 为 true 时，用户需执行此操作授权质押合约使用其 GLD1 代币。
  try {
    isApproving.value = true; // 开始加载
    error.value = ''; // 清空之前的错误
    console.log(ethers.MaxUint256);
    console.log(stakingContract.value.target);

    // 调用 ERC20 标准方法 approve：批准质押合约使用最大额度（避免重复批准）
    const tx = await token1Contract.value.approve(
      stakingContract.value.target, // 质押合约地址（target 即地址）
      ethers.MaxUint256 // 批准最大额度（2^256-1，足够大的数值）
    );

    transactionHash.value = tx.hash; // 记录交易哈希，供用户查看
    await tx.wait(); // 等待区块链确认交易（确保批准生效）
    approvalNeeded.value = false; // 批准成功，更新状态
  } catch (err) {
    error.value = err.message; // 捕获错误并显示
  } finally {
    isApproving.value = false; // 无论成功失败，结束加载状态
  }
};

const stake = async () => {
  try {
    isStaking.value = true; // 无论成功失败，结束加载状态
    error.value = ''; // 清空错误

    const amount = ethers.parseEther(stakeAmount.value.toString()); // 将用户输入的数量（ETH 单位）转为 wei 单位（合约交互需用最小单位）

    // 验证 1：检查用户 GLD1 余额是否足够
    const balance = await token1Contract.value.balanceOf(currentAccount.value);
    if (balance < amount) {
      throw new Error('余额不足');
    }
    console.log(balance);
    console.log(currentAccount.value); // 账户地址
    console.log(stakingContract.value.target);
    // 2. 检查批准额度
    // 验证 2：检查批准额度是否足够（防止用户批准后未刷新状态）
    const allowance = await token1Contract.value.allowance(
      currentAccount.value,
      stakingContract.value.target
    );
    if (allowance < amount) {
      throw new Error(
        `请先批准代币 (当前批准额度: ${ethers.formatEther(allowance)})`
      );
    }

    // 3. 执行质押

    // 执行质押：调用质押合约的 stake 方法，传入质押数量
    const tx = await stakingContract.value.stake(amount, {
      // 显式设置 gas 限制，避免默认值不足
      gasLimit: 1000000 // 明确设置gas限制
    });

    transactionHash.value = tx.hash; // 记录交易哈希
    const receipt = await tx.wait(); // 等待区块链确认

    // 4. 检查交易状态  验证交易是否成功（receipt.status 为 1 表示成功）
    if (receipt.status === 0) {
      throw new Error('交易在链上失败');
    }

    // 更新数据...
    // 交易成功后可在此处更新本地状态（如刷新余额、质押量等）
  } catch (err) {
    console.error('质押失败详情:', err);
    error.value = parseContractError(err); // 交易成功后可在此处更新本地状态（如刷新余额、质押量等）
  } finally {
    isStaking.value = false; // 结束加载状态
  }
};

// 错误解析工具函数 将区块链交易 / 合约调用的原始错误转换为用户友好的提示。
const parseContractError = (err) => {
  if (err.code === 'CALL_EXCEPTION') {
    return '合约调用验证失败 (可能参数无效)';
  }
  // 尝试解析合约自定义错误（通过合约 ABI 解码错误数据）
  if (err.data && stakingContract.value) {
    try {
      const decoded = stakingContract.value.interface.parseError(err.data);
      return `合约错误: ${decoded.name}`;
    } catch {}
  }
  //  fallback：返回原始错误信息
  return err.reason || err.message;
};
// 通过 watch 监听关键状态变化，自动触发检查逻辑：

// 当钱包连接状态、代币合约实例、质押合约实例变化时  例如用户刚连接钱包后，或合约实例初始化完成后，自动检查是否需要批准，避免用户手动触发。
watch([isConnected, token1Contract, stakingContract], () => {
  checkAllowance(); // 自动检查批准状态，确保 UI 同步
});

/* 
五、整体业务流程
连接钱包：用户未连接时显示 “连接 MetaMask” 按钮，连接后加载合约实例。
批准检查：连接后自动调用 checkAllowance，若未批准则显示提示。
批准操作：用户点击 “批准” 按钮，执行 approveToken1 授权合约使用代币。
质押操作：用户输入数量后点击 “质押”，执行 stake 函数：
验证余额和批准额度 → 调用合约 stake 方法 → 等待交易确认 → 更新状态。
反馈机制：通过 isApproving/isStaking 显示加载状态，transactionHash 显示交易哈希，error 显示错误信息。
总结
此 JS 逻辑完整实现了 ERC20 代币质押的核心流程，包含：

钱包连接状态管理
ERC20 代币批准机制（解决 “合约授权” 问题）
质押前的余额和权限验证
区块链交易的发起、确认和错误处理
用户交互状态反馈（加载、成功、失败）

通过响应式状态和生命周期管理，确保用户操作流畅且状态实时同步，同时通过错误解析提升用户体验，是区块链 DApp 中质押功能的典型实现。
 */
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
