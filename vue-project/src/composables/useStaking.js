import { ref, onMounted, onUnmounted } from 'vue';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

import StakingRewards from '../../../artifacts/contracts/StakingSward..sol/StakingRewards.json';
import Token1 from '../../../artifacts/contracts/Token1.sol/Token1.json';
import Token2 from '../../../artifacts/contracts/Token2.sol/Token2.json';

// import StakingRewards from '@/contracts/StakingRewards.json';
// import Token1 from '@/contracts/Token1.json';
// import Token2 from '@/contracts/Token2.json';

// import StakingRewards from '@artifacts/contracts/StakingRewards.json';
// import Token1 from '@artifacts/contracts/Token1.sol/Token1.json';
// import Token2 from '@artifacts/contracts/Token2.sol/Token2.json';
import contractAddresses from '@/contracts/contract-addresses.json';

export function useStaking() {
  const provider = ref(null); // 以太坊提供者实例（与区块链交互的入口）
  const signer = ref(null); // 签名者实例（代表已授权的账户，用于发送交易）
  const stakingContract = ref(null); // 智能合约实例
  const token1Contract = ref(null);// 智能合约实例
  const token2Contract = ref(null);// 智能合约实例
  const isConnected = ref(false); //是否已连接钱包
  const currentAccount = ref(''); // 当前连接的钱包地址
  const networkId = ref(''); // 当前网络 ID
  const error = ref(''); // 错误信息

  const rewardAmount = ref('0'); // 响应式奖励金额
  let refreshInterval = null; // 声明定时器
  
  // 初始化以太坊提供者
  const initEthereum = async () => {
    try {
      const ethereumProvider = await detectEthereumProvider();
      
      if (ethereumProvider) {
        provider.value = new ethers.BrowserProvider(ethereumProvider);
        
        // 监听账户变化
        ethereumProvider.on('accountsChanged', (accounts) => {
          currentAccount.value = accounts[0] || '';
          if (!accounts[0]) isConnected.value = false;
        });
        
        // 监听链变化
        ethereumProvider.on('chainChanged', (chainId) => {
          window.location.reload();
        });
        
        return true;
      } else {
        error.value = 'Please install MetaMask!';
        return false;
      }
    } catch (err) {
      error.value = err.message;
      return false;
    }
  };
  // 连接钱包的核心逻辑
  const connectWallet = async () => {
    try {
      // 1. 检查MetaMask是否可用
      if (!window.ethereum) throw new Error('MetaMask未安装')
  
      // 2. 创建新的Provider实例 (避免响应式代理问题)
      const freshProvider = new ethers.BrowserProvider(window.ethereum)
      
      // 3. 请求账户访问
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      
      // 4. 获取Signer (关键修复)
      const freshSigner = await freshProvider.getSigner()
      
      // 5. 更新响应式变量
      provider.value = freshProvider
      signer.value = freshSigner
      currentAccount.value = await freshSigner.getAddress()
      
      // 6. 获取网络ID (安全方式)
      const network = await freshProvider.getNetwork()
      networkId.value = String(network.chainId)
      
      // 7. 初始化合约
      console.log(1111111, contractAddresses.StakingRewards, );
      console.log(2222222, freshSigner );
      console.log(33333333, StakingRewards.abi );
      // 初始化三个智能合约实例（质押合约、代币 1 合约、代币 2 合约）
      stakingContract.value = new ethers.Contract(
        contractAddresses.StakingRewards,
        StakingRewards.abi,
        freshSigner // 使用新鲜signer实例
      )
      console.log(stakingContract.value);
      token1Contract.value = new ethers.Contract(
        contractAddresses.Token1,
        Token1.abi,
        freshSigner
      )
      console.log('token1', contractAddresses.Token1);
      console.log('token1ABI', Token1.abi);
      console.log('token1Contract', token1Contract.value);
      token2Contract.value = new ethers.Contract(
        contractAddresses.Token2,
        Token2.abi,
        freshSigner
      )
      console.log( 'token2',contractAddresses.Token2);
      console.log('token2Contract', token2Contract.value);
      isConnected.value = true
      return true
      
    } catch (err) {
      console.error('钱包连接失败:', err)
      error.value = err.code === 4001 
        ? '用户拒绝了连接请求' 
        : err.message || '未知错误'
      isConnected.value = false
      return false
    }
  }

  // 检查是否已有连接的账户
  const checkConnected = async () => {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      return await connectWallet();
    }
    return false;
  };
  
  // 初始化
  onMounted(async () => {
    await initEthereum();
    await checkConnected();
  });

  // 获取奖励金额的方法
  const fetchReward = async (stakingContract, account) => {
    if (!stakingContract || !account) return;
    console.log(111111,stakingContract) // 合约
    console.log(222222, account) // 账户
    try {
      const reward = await stakingContract.earned(account); 
      rewardAmount.value = ethers.formatEther(reward);
      console.log(23232323, rewardAmount);
    } catch (err) {
      console.error('获取奖励失败:', err);
    }
  };

  // 启动定时刷新
  const startRewardRefresh = (stakingContract, account, interval = 1000) => {
    stopRewardRefresh(); // 先停止已有的定时器
    fetchReward(stakingContract, account); // 立即获取一次
    refreshInterval = setInterval(
      () => fetchReward(stakingContract, account),
      interval
    );
  };

  // 停止刷新
  const stopRewardRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
  };

  // 组件卸载时自动清理
  onUnmounted(stopRewardRefresh);
  
  return {
    provider,
    signer,
    stakingContract,
    token1Contract,
    token2Contract,
    isConnected,
    currentAccount,
    networkId,
    error,
    connectWallet,
    checkConnected,
    rewardAmount,
    // 以下是新增的
    fetchReward,
    startRewardRefresh,
    stopRewardRefresh
  };
}

// import { ref, onMounted } from 'vue'
// import { ethers } from 'ethers'

// export function useEthers() {
//   const provider = ref(null)
//   const signer = ref(null)
//   const isConnected = ref(false)
//   const error = ref(null)

//   // 更安全的初始化方法
//   const initProvider = async () => {
//     try {
//       if (window.ethereum) {
//         // 监听账户变化
//         window.ethereum.on('accountsChanged', (accounts) => {
//           if (accounts.length === 0) {
//             isConnected.value = false
//           }
//         })

//         // 监听链变化
//         window.ethereum.on('chainChanged', () => {
//           window.location.reload()
//         })

//         // 使用更兼容的方式初始化 provider
//         provider.value = new ethers.BrowserProvider(window.ethereum)
        
//         try {
//           const accounts = await window.ethereum.request({ method: 'eth_accounts' })
//           if (accounts.length > 0) {
//             signer.value = await provider.value.getSigner()
//             isConnected.value = true
//           }
//         } catch (e) {
//           console.log("No authorized accounts")
//         }
        
//         return true
//       } else {
//         error.value = 'Please install MetaMask!'
//         return false
//       }
//     } catch (err) {
//       error.value = err.message
//       return false
//     }
//   }

//   // 连接钱包
//   const connectWallet = async () => {
//     try {
//       error.value = null
//       if (!provider.value) await initProvider()
      
//       const accounts = await window.ethereum.request({ 
//         method: 'eth_requestAccounts' 
//       })
      
//       signer.value = await provider.value.getSigner()
//       isConnected.value = true
//       return accounts[0]
//     } catch (err) {
//       error.value = err.message
//       isConnected.value = false
//       throw err
//     }
//   }

//   // 初始化时检测
//   onMounted(async () => {
//     await initProvider()
//   })

//   return {
//     provider,
//     signer,
//     isConnected,
//     error,
//     connectWallet,
//     initProvider
//   }
// }