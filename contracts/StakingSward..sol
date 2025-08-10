// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract StakingRewards {

    /* 
    stakingToken 和 rewardsToken 是不可变（immutable）变量，部署时指定后不可修改，确保质押和奖励代币的唯一性。
    owner 为合约部署者，通过 onlyOwner 修饰符控制关键操作权限。
     */
    IERC20 public immutable stakingToken; // 质押代币（如 GLD1）  
    IERC20 public immutable rewardsToken; // 奖励代币（如 GLD2）
    address public owner; // 合约所有者（有权设置奖励参数）
    uint256 public duration; // 奖励发放周期（单位：秒）
    uint256 public finishAt; // 当前奖励周期结束时间（时间戳）
    uint256 public updatedAt; // 最近一次更新奖励状态的时间（时间戳）
    uint256 public rewardRate; // 每秒奖励速率（单位：rewardsToken/秒）
    uint256 public rewardPerTokenStored; // 存储的每单位质押代币对应的奖励（用于累计计算）

    mapping(address => uint256) public userRewardPerTokenPaid; // 记录用户已获得的奖励标记（用于避免重复计算）
    mapping(address => uint256) public rewards; // 记录用户当前累积的未领取奖励

    uint256 public totalSupply;  // 全网总质押量（所有用户质押的 stakingToken 总量）
    mapping(address => uint256) public balanceOf;  // 单个用户的质押量

     /* 
     合约通过两个核心修饰符确保状态准确性和权限安全：
     onlyOwner：权限控制
     updateReward：奖励状态同步
     限制仅合约所有者可调用关键函数（如设置奖励周期、添加奖励），防止恶意篡改奖励参数。

     核心作用：在执行质押、提现、领取奖励等关键操作前，自动同步最新的奖励状态，确保奖励计算准确（避免因时间推移导致的奖励漏算）。
     是合约中 “实时更新奖励” 的核心机制，保证每次用户操作时的奖励数据都是最新的。
    */
      
    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _; // 执行函数主体
    }

    modifier updateReward(address _account) {
        rewardPerTokenStored = rewardPerToken();  // 更新当前每单位质押代币的奖励
        updatedAt = lastTimeRewardApplicable();  // 更新最近状态时间为当前有效时间

        if (_account != address(0)) {
             // 若传入有效用户地址，更新该用户的累积奖励和已标记奖励
            rewards[_account] = earned(_account);
            userRewardPerTokenPaid[_account] = rewardPerTokenStored;
        }

        _; // 执行函数主体
    }
    

    constructor(address _stakingToken, address _rewardsToken) {
        owner = msg.sender; // 部署者为初始所有者
        stakingToken = IERC20(_stakingToken);  // 绑定质押代币
        rewardsToken = IERC20(_rewardsToken); // 绑定奖励代币
    } 

     /* 
     管理员操作：配置奖励参数
    （1）设置奖励周期 setRewardsDuration 
    仅所有者可调用，用于设置奖励发放的时间周期（如每天、每周），需在当前周期结束后才能修改。
    */
    function setRewardsDuration(uint256 _duration) external onlyOwner {
        require(finishAt < block.timestamp, "reward duration not finished");  // 确保当前周期已结束
        duration = _duration;  // 更新奖励周期（如设置为 86400 秒即 1 天）
    }
    /* 
    添加奖励 notifyRewardAmount 
    核心作用：所有者向合约添加奖励代币（_amount 为 rewardsToken 数量），并计算 / 更新奖励速率（每秒发放多少奖励）。
    支持 “续期奖励”：若当前周期未结束，会将剩余奖励与新奖励合并，避免奖励中断。
    必须确保合约中 rewardsToken 余额充足（rewardRate * duration 不超过余额），否则用户无法领取奖励。
    */
    function notifyRewardAmount(uint256 _amount)
        external
        onlyOwner
        updateReward(address(0))
    {
        // 若当前无活跃奖励周期（或已结束），直接按新奖励和周期计算速率
        if (block.timestamp > finishAt) {
            rewardRate = _amount / duration;
        } else {
            // 若当前周期未结束，计算剩余奖励并合并新奖励，重新计算速率
            uint256 remainingRewards = rewardRate *
                (finishAt - block.timestamp);
            rewardRate = (remainingRewards + _amount) / duration;
        }
        // 验证奖励速率有效且合约有足够奖励代币
        require(rewardRate > 0, "reward rate = 0");
        require(
            rewardRate * duration <= rewardsToken.balanceOf(address(this)),
            "reward amount > balance"
        );
        finishAt = block.timestamp + duration;  // 更新周期结束时间
        updatedAt = block.timestamp; // 更新状态时间
    }
    /* 
    质押代币 stake 
    用户质押 stakingToken 时，需先通过 approve 授权合约转移代币。
    调用前通过 updateReward(msg.sender) 同步用户奖励状态，确保质押前的奖励已被记录。
    */
    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");  // 质押数量必须大于 0
         // 从用户地址转移质押代币到合约（需用户提前授权合约）
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        balanceOf[msg.sender] += _amount; // 更新用户质押量
        totalSupply += _amount;  // 更新全网总质押量
    }

    /* 
    提现代币 withdraw

    用户可随时提取部分或全部质押代币，提取前通过 updateReward 同步奖励，确保提现前的奖励已计算。
     */
    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(_amount > 0, "amount = 0");  // 提现数量必须大于 0
        balanceOf[msg.sender] -= _amount; // 减少用户质押量
        totalSupply -= _amount; // 减少全网总质押量
        stakingToken.transfer(msg.sender, _amount);  // 将质押代币转回用户
    }
   /*  
   有效奖励时间 lastTimeRewardApplicable
   奖励仅在当前周期内有效，若当前时间已超过 finishAt，则奖励计算截止到 finishAt。
    */
    function lastTimeRewardApplicable() public view returns (uint256) {
        return _min(block.timestamp, finishAt);  // 取当前时间或周期结束时间的最小值 
    }
     /* 
     每单位质押代币的奖励 rewardPerToken
     核心公式：每单位质押代币的奖励 = 历史累积奖励 + 新增奖励（按时间和总质押量分配）。
     乘以 1e18 是为了避免小数精度丢失（Solidity 不支持浮点数，用整数模拟）。
      */
    function rewardPerToken() public view returns (uint256) {
        if (totalSupply == 0) { // 若无人质押，奖励为 0
            return rewardPerTokenStored;
        }
        // 计算公式：存储的奖励 + （奖励速率 × 有效时间差）× 1e18 / 总质押量
        return
            rewardPerTokenStored +
            ((rewardRate * (lastTimeRewardApplicable() - updatedAt)) * 1e18) /
            totalSupply;
    }
    /* 
    计算用户从上次标记奖励后新增的奖励，加上历史未领取奖励，得到总应得奖励。
    userRewardPerTokenPaid 记录用户上次操作时的奖励标记，用于计算 “新增奖励”（避免重复计算）。
     */
    function earned(address _account) public view returns (uint256) {
        // 计算公式：（用户质押量 × （当前每单位奖励 - 已标记奖励）） / 1e18 + 未领取奖励
        return
            (balanceOf[_account] *
                (rewardPerToken() - userRewardPerTokenPaid[_account])) /
            1e18 +
            rewards[_account];
    }
    /* 
    领取奖励 getReward
    用户领取累积的 rewardsToken 奖励，领取前通过 updateReward 确保奖励金额最新。
    领取后重置用户奖励记录，防止重复领取。
     */
    function getReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];  // 获取用户累积的未领取奖励
        if (reward > 0) {
            rewards[msg.sender] = 0; // 重置奖励（避免重复领取）
            rewardsToken.transfer(msg.sender, reward); // 转移奖励代币给用户
        }
    }

    function _min(uint256 x, uint256 y) private pure returns (uint256) {
        return x <= y ? x : y;
    }
}
/* 
五、完整业务流程
管理员配置：
部署合约，指定 stakingToken（如 GLD1）和 rewardsToken（如 GLD2）。
调用 setRewardsDuration 设置奖励周期（如 86400 秒 = 1 天）。
调用 notifyRewardAmount 存入奖励代币（如 1000 GLD2），合约自动计算 rewardRate（如 1000 / 86400 ≈ 0.01157 GLD2 / 秒）。
用户操作：
用户授权合约转移 stakingToken 后，调用 stake 质押代币（如 100 GLD1）。
质押期间，合约按 rewardRate 和用户质押比例实时累积奖励。
用户可随时调用 withdraw 提取部分或全部质押代币（如提取 50 GLD1）。
调用 getReward 领取累积的奖励代币（如 5 GLD2）。
奖励更新：
每次用户执行 stake/withdraw/getReward 时，updateReward 修饰符自动同步奖励状态，确保奖励计算准确。
若奖励周期结束，管理员可通过 notifyRewardAmount 新增奖励，开启下一轮周期。

六、合约特点与注意事项
精确性：通过 updateReward 修饰符和数学公式，确保奖励按时间和质押量精确分配，无漏算或重复计算。
灵活性：支持动态调整奖励周期和奖励量，适应不同运营需求。
安全性：onlyOwner 权限控制防止非授权操作，transferFrom 和 transfer 确保代币转移安全。
依赖条件：奖励代币需提前转入合约，否则用户调用 getReward 时会失败（无代币可转）。
扩展性：可通过扩展 onlyOwner 功能（如添加多签）增强权限管理，或增加质押锁仓期等规则。
总结
这个 StakingRewards 合约是一个功能完整的质押奖励系统，核心逻辑可概括为：用户质押代币获得按时间和比例分配的奖励，
管理员负责配置奖励参数和提供奖励代币。通过状态同步、精确计算和权限控制，实现了质押 - 奖励的公平性和可操作性，
是 DeFi 领域中质押挖矿（Staking Mining）模式的典型实现。
 */