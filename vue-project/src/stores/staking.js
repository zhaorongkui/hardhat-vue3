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

  /*  
   输入：userStakedAmount.value 是用户质押的代币数量（原始值，单位为最小单位，如 wei）。
   转换：ethers.formatEther() 是 Ethers.js 提供的工具函数，将以 wei 为单位的数值转换为以 ETH 为单位的字符串（实际适用于所有 18 位小数的 ERC20 代币）。
   作用：将用户质押的原始数量（如 1000000000000000000 wei）转换为可读格式（如 1.0 GLD1），用于页面展示。
   */
  const formattedUserStaked = computed(() => {
    return ethers.formatEther(userStakedAmount.value); // ethers.formatEther(value) 本质是执行 value / 10^18 的计算，并返回字符串格式的结果（如 '1.5'），简化了区块链中常见的单位转换逻辑。
  });

  /* 
  输入：userRewardAmount.value 是用户累积的未领取奖励（原始值，单位为奖励代币的最小单位）。
  转换：同样使用 ethers.formatEther() 转换为可读格式。
  作用：将用户待领取的奖励（如 500000000000000000 wei）转换为可读格式（如 0.5 GLD2），用于页面展示 “可领取奖励”。
   */
  const formattedUserReward = computed(() => {
    return ethers.formatEther(userRewardAmount.value);
  });

  /*  
  输入：totalStaked.value 是全网用户的总质押量（原始值，单位为最小单位）。
  转换：使用 ethers.formatEther() 转换为可读格式。
  作用：将全网总质押量（如 100000000000000000000 wei）转换为可读格式（如 100.0 GLD1），用于页面展示 “总质押量”。 
 */
  const formattedTotalStaked = computed(() => {
    return ethers.formatEther(totalStaked.value);
  });

  // 更新用户信息
  async function updateUserInfo(stakingContract, address) {
    if (!stakingContract || !address) return;

    userStakedAmount.value = await stakingContract.balanceOf(address);
    userRewardAmount.value = await stakingContract.earned(address); // 用于计算指定用户当前累积的未领取奖励（即该用户通过质押应得但尚未领取的奖励代币数量）。
  }

  // 更新全局信息
  async function updateGlobalInfo(stakingContract) {
    if (!stakingContract) return;

    totalStaked.value = await stakingContract.totalSupply(); // 总供给 Contract.totalSupply() 是 ERC20 标准代币合约中最基础的方法之一，用于查询该代币的总供应量（即该代币的总发行量）。
    rewardRate.value = await stakingContract.rewardRate(); // 奖励率 Contract.rewardRate() 是一个核心函数，用于计算单位时间内分配给质押者的奖励数量。它直接决定了用户质押资产后能获得的奖励速度，是奖励机制的核心参数。
    rewardDuration.value = await stakingContract.duration(); // 持续时间 在质押奖励合约（如你之前提供的 StakingRewards 合约）中，stakingContract.duration() 是一个用于获取奖励发放周期时长的方法。它返回的是奖励从开始到结束的持续时间（通常以秒为单位），是合约中控制奖励发放节奏的核心参数之一。
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

/* 
rewardRate() 的作用

rewardRate 通常表示 “每秒（或每个区块）分配的奖励代币数量”（具体单位取决于合约设计，多数以秒为单位）。它是计算用户质押收益的核心基准：
用户收益 = 质押数量 × 质押时间 × rewardRate ÷ 总质押量（简化公式，实际需考虑时间区间和动态调整）。
结合质押合约的具体逻辑（以你之前的 StakingRewards 合约为例）
在你提供的 StakingRewards 合约中，rewardRate() 的实现和作用如下：
1. 状态变量定义
solidity
uint256 public rewardRate; // 公开状态变量，存储当前奖励速率
2. rewardRate 的计算与更新
rewardRate 由合约所有者通过 notifyRewardAmount() 函数设置，逻辑如下：

当首次设置奖励或奖励周期已结束时：
rewardRate = 总奖励数量 ÷ 奖励周期时长（秒）
当奖励周期未结束，追加新奖励时：
rewardRate = （剩余奖励 + 新奖励）÷ 奖励周期时长（秒）

示例代码片段：

solidity
function notifyRewardAmount(uint256 _amount) external onlyOwner updateReward(address(0)) {
    if (block.timestamp > finishAt) {
        // 奖励周期已结束，直接按新奖励计算
        rewardRate = _amount / duration; 
    } else {
        // 奖励周期未结束，叠加剩余奖励后重新计算
        uint256 remainingRewards = rewardRate * (finishAt - block.timestamp);
        rewardRate = (remainingRewards + _amount) / duration; 
    }
    // ... 其他校验逻辑
}
3. rewardRate 在收益计算中的作用
用户的实际收益通过 rewardPerToken() 和 earned() 函数计算，而 rewardRate 是核心输入：

rewardPerToken() 计算 “每单位质押资产能获得的奖励”，公式中包含 rewardRate × 时间差：
solidity
function rewardPerToken() public view returns (uint256) {
    if (totalSupply == 0) return rewardPerTokenStored;
    return rewardPerTokenStored + 
        ((rewardRate * (lastTimeRewardApplicable() - updatedAt)) * 1e18) / totalSupply;
}


最终用户收益 earned() 基于 rewardPerToken() 计算，本质是 质押数量 × 单位质押奖励。
关键特点
动态调整：rewardRate 会随新奖励的追加或周期变化而更新，确保奖励分配速率平滑过渡。
权限控制：通常只能由合约所有者通过 notifyRewardAmount() 设置，避免恶意篡改。
约束校验：合约会校验 rewardRate × 周期时长 ≤ 合约中奖励代币余额，确保奖励可兑付（防止超发）。
总结
Contract.rewardRate() 是质押奖励 合约中决定奖励分配速度的核心参数，直接影响用户的收益多少。它通过 “总奖励 ÷ 周期时长” 计算，动态调整以适应新奖励追加，并作为用户收益计算的基准。理解 rewardRate 有助于分析质押收益的合理性和合约的经济模型设计。*/





/* 
stakingContract.duration()

在质押奖励合约（如你之前提供的 StakingRewards 合约）中，stakingContract.duration() 是一个用于获取奖励发放周期时长的方法。它返回的是奖励从开始到结束的持续时间（通常以秒为单位），是合约中控制奖励发放节奏的核心参数之一。
具体作用与细节
定义与用途
在合约中，duration 是一个公开的状态变量，通常被声明为 uint256 public duration;。duration() 方法本质上是对这个变量的读取，返回当前设定的奖励周期时长（例如 86400 秒 = 1 天，或 604800 秒 = 1 周）。
这个周期决定了奖励池中所有奖励将在多长时间内逐步发放给质押用户。
与奖励发放的关联
当合约管理员通过 notifyRewardAmount(uint256 _amount) 方法注入奖励时，合约会根据 duration 计算每秒奖励速率（rewardRate）：
若当前无正在进行的奖励周期（block.timestamp > finishAt），则 rewardRate = _amount / duration；
若有未结束的周期，则会将剩余奖励与新注入奖励合并，再按 duration 重新计算 rewardRate。
最终，奖励会在 duration 时间内按 rewardRate 逐步分配给质押用户。
权限与修改
在你提供的 StakingRewards 合约中，duration 只能由合约所有者通过 setRewardsDuration(uint256 _duration) 方法修改，且修改需满足条件：当前奖励周期已结束（finishAt < block.timestamp），避免影响正在进行的奖励发放。
示例场景
假设合约中 duration 被设置为 86400（1 天），管理员注入 1000 枚奖励代币：

合约会计算 rewardRate = 1000 / 86400 ≈ 0.01157 枚 / 秒；
奖励将在接下来的 1 天内，以每秒约 0.01157 枚的速率分配给所有质押用户；
若用户在此期间质押了代币，可根据质押时长和数量按比例获得奖励。
总结
stakingContract.duration() 是获取奖励发放周期的核心方法，它直接决定了奖励发放的持续时间和速率，是理解质押奖励分配逻辑的关键参数之一。 */



/* 
stakingContract.earned(address _account)


在质押奖励合约（如你之前分析的 StakingRewards 合约）中，stakingContract.earned(address _account) 是一个核心函数，用于计算指定用户当前累积的未领取奖励（即该用户通过质押应得但尚未领取的奖励代币数量）。
具体作用与逻辑
核心功能
输入用户地址 _account，返回该用户从质押开始到当前时刻，根据质押数量、质押时长和奖励规则累积的所有未领取奖励（单位为奖励代币的最小精度单位，如 wei）。
计算逻辑（以 StakingRewards 合约为例）
合约中 earned 函数的实现如下：
solidity
function earned(address _account) public view returns (uint256) {
    return
        (balanceOf[_account] * 
         (rewardPerToken() - userRewardPerTokenPaid[_account])) / 
        1e18 + 
        rewards[_account];
}

拆解公式：
balanceOf[_account]：用户当前的质押数量（单位：质押代币的最小单位）。
rewardPerToken()：当前每单位质押代币可获得的总奖励（动态计算，随时间增长）。
userRewardPerTokenPaid[_account]：用户上次操作（质押、提现、领奖励）时记录的 “每单位质押奖励”（用于标记已计算过的奖励，避免重复计算）。
1e18：精度转换因子（因 Solidity 无浮点数，用整数模拟小数计算）。
rewards[_account]：用户历史未领取的奖励（上次操作后累积的奖励）。
简单说：用户新增奖励 = 质押数量 ×（当前单位奖励 - 上次单位奖励）+ 历史未领奖励。
调用场景
用户查看自己的待领取奖励时（前端页面展示 “可领取奖励”）。
用户执行质押、提现或领取奖励操作前，合约通过 updateReward 修饰符自动调用 earned，更新用户的奖励记录。
领取奖励时，合约根据 earned 的返回值向用户发放奖励代币。
示例流程
假设：

用户质押了 100 枚 stakingToken，质押期间 rewardPerToken 从 10 增长到 30。
用户上次操作时记录的 userRewardPerTokenPaid 为 10。
历史未领奖励 rewards[_account] 为 50。

则当前 earned 计算为：
(100 × (30 - 10)) / 1e18 × 1e18（还原精度） + 50 = 2000 + 50 = 2050（单位：奖励代币的最小单位）。
总结
stakingContract.earned(_account) 是质押奖励系统中计算用户应得奖励的核心函数，它动态跟踪用户的质押行为和时间，精确计算未领取的奖励，是 “质押即挖矿” 模式中分配奖励的关键逻辑。 */