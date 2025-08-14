const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  
  // 获取账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // 部署 Token1 并等待确认
  const Token1 = await ethers.getContractFactory("Token1");
  const token1 = await Token1.deploy(ethers.parseEther("1000000"));
  await token1.waitForDeployment(); // 等待部署完成
  const token1Address = await token1.getAddress(); // 确认后再获取地址
  console.log("Token1 deployed to:", token1Address);

  // 部署 Token2 并等待确认
  const Token2 = await ethers.getContractFactory("Token2");
  const token2 = await Token2.deploy(ethers.parseEther("1000000"));
  await token2.waitForDeployment();
  const token2Address = await token2.getAddress();
  console.log("Token2 deployed to:", token2Address);

  // 部署 StakingRewards 并等待确认
  const StakingRewards = await ethers.getContractFactory("StakingRewards");
  const staking = await StakingRewards.deploy(token1Address, token2Address);
  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log("StakingRewards deployed to:", stakingAddress);

  // 转移 Token2 到 Staking 合约（使用已确认的地址）
  const transferTx = await token2.transfer(stakingAddress, ethers.parseEther("100000"));
  await transferTx.wait(); // 等待转账确认
  console.log("Transferred 100000 Token2 to Staking contract");

  // 设置奖励持续时间
  const durationTx = await staking.setRewardsDuration(7 * 24 * 60 * 60);
  // const durationTx = await staking.setRewardsDuration(1);
  await durationTx.wait();
  console.log("Rewards duration set to 7 days");
  
  // 通知奖励数量
  const rewardTx = await staking.notifyRewardAmount(ethers.parseEther("10000"));
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
    
