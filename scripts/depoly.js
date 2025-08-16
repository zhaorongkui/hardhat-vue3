const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners(); // // 获取部署者账户（第一个签名者）
  
  console.log("Deploying contracts with the account:", deployer.address);
  
  // 获取账户余额 // 查看部署者账户余额（确保有足够的 gas 费用）
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH"); //将余额从 wei（最小单位）转换为 ETH 单位，方便阅读。


  
/*   
作用：部署两种 ERC20 代币（假设 Token1 和 Token2 是标准 ERC20 合约），用于质押和奖励。
ethers.getContractFactory("Token1")：获取 Token1 合约的工厂类，用于部署新实例。
deploy(ethers.parseEther("1000000"))：部署时传入初始发行量（100 万枚，parseEther 将 ETH 单位转换为 wei）。
waitForDeployment()：等待部署交易被区块链确认（避免未确认时获取地址失败）。
getAddress()：获取部署后的合约地址（后续会用到这个地址初始化质押合约）。
 */

  // 部署 Token1 并等待确认
  const Token1 = await ethers.getContractFactory("Token1");
  const token1 = await Token1.deploy(ethers.parseEther("1000000"));
  await token1.waitForDeployment(); // 等待部署交易上链确认
  const token1Address = await token1.getAddress(); // 确认后再获取地址
  console.log("Token1 deployed to:", token1Address);

  // 部署 Token2 并等待确认
  const Token2 = await ethers.getContractFactory("Token2");
  const token2 = await Token2.deploy(ethers.parseEther("1000000"));
  await token2.waitForDeployment();// 等待部署交易上链确认
  const token2Address = await token2.getAddress();// 获取部署后的合约地址
  console.log("Token2 deployed to:", token2Address);


/* 
作用：部署核心的质押奖励合约，用于管理用户质押和奖励发放。
构造函数参数 (token1Address, token2Address)：
token1Address：用户需要质押的代币（质押物）。
token2Address：作为奖励发放的代币（奖励物）。
即：用户质押 Token1，合约会发放 Token2 作为奖励。 */

  // 部署 StakingRewards 并等待确认
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(token1Address, token2Address);
  await staking.waitForDeployment();// 等待部署交易上链确认
  const stakingAddress = await staking.getAddress();// 获取部署后的合约地址
  console.log("StakingRewards deployed to:", stakingAddress);


  /* 作用：向质押合约转入 10 万枚 Token2，作为奖励池的初始资金（用户质押后能从中获得奖励）。
  token2.transfer(...)：调用 Token2 的转账方法，将代币转入质押合约地址。 */

  // 转移 Token2 到 Staking 合约（使用已确认的地址）
  const transferTx = await token2.transfer(stakingAddress, ethers.parseEther("100000"));
  await transferTx.wait(); // 等待转账确认
  console.log("Transferred 100000 Token2 to Staking contract");

/* 
  作用：设置奖励发放的持续时间（这里是 7 天，单位为秒）。
  即：奖励池中的 Token2 会在 7 天内匀速发放给质押者。 */
  // 设置奖励持续时间
  const durationTx = await staking.setRewardsDuration(7 * 24 * 60 * 60); // 一周内
  // const durationTx = await staking.setRewardsDuration(15 * 60); // 15分钟内匀速发放给质押者
  await durationTx.wait();
  console.log("Rewards duration set to 7 days");
  

 /*  
  作用：通知质押合约本次要发放的奖励数量（1 万枚 Token2），并开始计算奖励速率。
  rewardRate：奖励速率（每秒发放的 Token2 数量），计算公式为 奖励总量 / 持续时间（10000 Token2 / 7 天的秒数）。
  finishAt：奖励发放结束的时间戳（部署时间 + 7 天） 
  */

  // 通知奖励数量
  const rewardTx = await staking.notifyRewardAmount(ethers.parseEther("10000"));
  console.log("当前奖励速率:", await staking.rewardRate()); // 每秒发放的奖励数量
  console.log("奖励结束时间:", await staking.finishAt()); // 奖励发放结束的时间戳
  await rewardTx.wait();
  console.log("Notified reward amount: 10000 Token2");

  // 保存部署信息到前端
  const fs = require("fs");
  const contractsDir = __dirname + "/../vue-project/src/contracts";
  
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true }); // 确保父目录存在
  }

  fs.writeFileSync(
    contractsDir + "/contract-addresses.json",
    JSON.stringify({
      Token1: token1Address,
      Token2: token2Address,
      StakingRewards: stakingAddress
    }, undefined, 2)
  );

  // 读取合约ABI
  const Token1Artifact = await ethers.getContractFactory("Token1");
  const Token2Artifact = await ethers.getContractFactory("Token2");
  const StakingRewardsArtifact = await ethers.getContractFactory("StakingRewards");

  fs.writeFileSync(
    contractsDir + "/Token1.json",
    JSON.stringify(Token1Artifact.interface, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/Token2.json",
    JSON.stringify(Token2Artifact.interface, null, 2)
  );
  fs.writeFileSync(
    contractsDir + "/StakingRewards.json",
    JSON.stringify(StakingRewardsArtifact.interface, null, 2)
  );

  console.log("Deployment completed successfully");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
    
