import { ref, onMounted } from 'vue';
import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';
import StakingRewards from '@/contracts/StakingRewards.json';
import Token1 from '@/contracts/Token1.json';
import Token2 from '@/contracts/Token2.json';
import contractAddresses from '@/contracts/contract-addresses.json';

export function useStaking() {
  const provider = ref(null);
  const signer = ref(null);
  const stakingContract = ref(null);
  const token1Contract = ref(null);
  const token2Contract = ref(null);
  const isConnected = ref(false);
  const currentAccount = ref('');
  const networkId = ref('');
  const error = ref('');
  
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
  
  // 连接钱包
  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      signer.value = await provider.value.getSigner();
      currentAccount.value = await signer.value.getAddress();
      networkId.value = await window.ethereum.request({ method: 'eth_chainId' });
      
      // 初始化合约
      stakingContract.value = new ethers.Contract(
        contractAddresses.StakingRewards,
        StakingRewards.abi,
        signer.value
      );
      
      token1Contract.value = new ethers.Contract(
        contractAddresses.Token1,
        Token1.abi,
        signer.value
      );
      
      token2Contract.value = new ethers.Contract(
        contractAddresses.Token2,
        Token2.abi,
        signer.value
      );
      
      isConnected.value = true;
      return true;
    } catch (err) {
      error.value = err.message;
      return false;
    }
  };
  
  // 检查是否已连接
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
    checkConnected
  };
}