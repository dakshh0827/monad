// File: src/wagmiConfig.js
// --- FULL UPDATED CODE ---

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';

// Import ABIs
import MonadFeedABI from '../../contracts/out/MonadFeed.sol/MonadFeed.json';
// --- ADD THESE TWO NEW IMPORTS ---
import MFDTokenABI from '../../contracts/out/MFD.sol/MFDToken.json';
import MFDClaimerABI from '../../contracts/out/MFDClaimer.sol/MFDClaimer.json';

// 1. Get projectId from https://cloud.walletconnect.com
export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!projectId) {
  throw new Error('VITE_WALLETCONNECT_PROJECT_ID is not set in .env');
}

// 2. Create wagmiConfig
const metadata = {
  name: 'MonadFeed',
  description: 'A Decentralised Web3 News Curation Platform on Monad',
  url: 'https://monadfeed.xyz', // origin domain
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

export const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MONAD', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet-explorer.monad.xyz' },
  },
  testnet: true,
};

const chains = [monadTestnet];
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
  enableWalletConnect: true,
  enableOnramp: true,
  enableEmail: true,
});

// 3. Create modal
createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#E79B04',
    '--w3m-border-radius-master': '1px',
  },
});

// 4. Export Contract Details

// --- YOUR OLD CONTRACT ---
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const CONTRACT_ABI = MonadFeedABI.abi;

// --- YOUR TWO NEW CONTRACTS ---
export const MFD_TOKEN_ADDRESS = import.meta.env.VITE_MFD_TOKEN_ADDRESS;
export const MFD_TOKEN_ABI = MFDTokenABI.abi;

export const MFD_CLAIMER_ADDRESS = import.meta.env.VITE_MFD_CLAIMER_ADDRESS;
export const MFD_CLAIMER_ABI = MFDClaimerABI.abi;