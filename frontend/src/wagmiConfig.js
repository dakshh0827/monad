import { createWeb3Modal } from '@web3modal/wagmi/react'
import { defaultWagmiConfig } from '@web3modal/wagmi/react'
import { defineChain } from 'viem' // 1. Import defineChain
import { sepolia } from 'wagmi/chains' // Or your preferred chains


// --- 2. DEFINE MONAD TESTNET ---
// (NOTE: Fill these in with the REAL Monad Testnet details if they are different)
export const monadTestnet = defineChain({
  id: 10143, // This is Base Goerli, you need to find the REAL Monad Chain ID
  name: 'Monad Testnet',
  nativeCurrency: { name: 'Monad', symbol: 'MON', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet-rpc.monad.xyz/'] }, // <-- Find the REAL Monad RPC URL
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' }, // <-- Find the REAL Explorer
  },
})

// 1. Get WalletConnect Project ID from https://cloud.walletconnect.com
//    You MUST get your own project ID.
//    Store this in a .env.local file at /frontend/.env.local
//    VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

if (!projectId) {
  throw new Error("VITE_WALLETCONNECT_PROJECT_ID is not set in .env.local");
}

// 2. Create wagmiConfig
const metadata = {
  name: 'MonadFeed',
  description: 'Decentralized Web3 News Curation',
  url: 'http://localhost:5173', // Your dApp's URL
  icons: ['https/avatars.githubusercontent.com/u/37784886'] // Optional icon
}

const chains = [monadTestnet, sepolia]; // Add mainnet, polygon, etc. as needed
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// 3. Create modal
createWeb3Modal({
  wagmiConfig: wagmiConfig,
  projectId,
  chains
});

// 4. Export your Contract ABI and Address
export const CONTRACT_ADDRESS = "0x1e9f2F91E0673E3313C68b49a2262814C7d8921e"; // <-- REPLACE THIS

export const CONTRACT_ABI = [
  {
    "type": "event",
    "name": "ArticleSubmitted",
    "inputs": [
      {"name": "articleId", "type": "uint256", "indexed": true},
      {"name": "ipfsHash", "type": "string", "indexed": false},
      {"name": "curator", "type": "address", "indexed": true},
      {"name": "timestamp", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ArticleUpvoted",
    "inputs": [
      {"name": "articleId", "type": "uint256", "indexed": true},
      {"name": "voter", "type": "address", "indexed": true},
      {"name": "curator", "type": "address", "indexed": true},
      {"name": "newUpvoteCount", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CommentPosted",
    "inputs": [
      {"name": "articleId", "type": "uint256", "indexed": true},
      {"name": "commentId", "type": "uint256", "indexed": true},
      {"name": "ipfsHash", "type": "string", "indexed": false},
      {"name": "commenter", "type": "address", "indexed": true},
      {"name": "timestamp", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "CommentUpvoted",
    "inputs": [
      {"name": "commentId", "type": "uint256", "indexed": true},
      {"name": "articleId", "type": "uint256", "indexed": true},
      {"name": "voter", "type": "address", "indexed": true},
      {"name": "commenter", "type": "address", "indexed": false},
      {"name": "newUpvoteCount", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisplayNameSet",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "displayName", "type": "string", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PointsAwarded",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "pointsEarned", "type": "uint256", "indexed": false},
      {"name": "totalPoints", "type": "uint256", "indexed": false}
    ],
    "anonymous": false
  },
  {
    "type": "function",
    "name": "articleComments",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256[]"}]
  },
  {
    "type": "function",
    "name": "articleCount",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "articles",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "uint256"}],
    "outputs": [
      {"name": "ipfsHash", "type": "string"},
      {"name": "curator", "type": "address"},
      {"name": "upvoteCount", "type": "uint256"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "exists", "type": "bool"}
    ]
  },
  {
    "type": "function",
    "name": "commentCount",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "comments",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "uint256"}],
    "outputs": [
      {"name": "ipfsHash", "type": "string"},
      {"name": "articleId", "type": "uint256"},
      {"name": "commenter", "type": "address"},
      {"name": "upvoteCount", "type": "uint256"},
      {"name": "timestamp", "type": "uint256"},
      {"name": "exists", "type": "bool"}
    ]
  },
  {
    "type": "function",
    "name": "displayNames",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "address"}],
    "outputs": [{"name": "", "type": "string"}]
  },
  {
    "type": "function",
    "name": "getArticle",
    "stateMutability": "view",
    "inputs": [{"name": "_articleId", "type": "uint256"}],
    "outputs": [
      {"name": "ipfsHash", "type": "string"},
      {"name": "curator", "type": "address"},
      {"name": "upvoteCount", "type": "uint256"},
      {"name": "timestamp", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "getArticleComments",
    "stateMutability": "view",
    "inputs": [{"name": "_articleId", "type": "uint256"}],
    "outputs": [{"name": "", "type": "uint256[]"}]
  },
  {
    "type": "function",
    "name": "getArticlesBatch",
    "stateMutability": "view",
    "inputs": [
      {"name": "_startId", "type": "uint256"},
      {"name": "_count", "type": "uint256"}
    ],
    "outputs": [
      {"name": "ids", "type": "uint256[]"},
      {"name": "curators", "type": "address[]"},
      {"name": "upvoteCounts", "type": "uint256[]"},
      {"name": "timestamps", "type": "uint256[]"}
    ]
  },
  {
    "type": "function",
    "name": "getComment",
    "stateMutability": "view",
    "inputs": [{"name": "_commentId", "type": "uint256"}],
    "outputs": [
      {"name": "ipfsHash", "type": "string"},
      {"name": "articleId", "type": "uint256"},
      {"name": "commenter", "type": "address"},
      {"name": "upvoteCount", "type": "uint256"},
      {"name": "timestamp", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "getDisplayName",
    "stateMutability": "view",
    "inputs": [{"name": "_user", "type": "address"}],
    "outputs": [{"name": "", "type": "string"}]
  },
  {
    "type": "function",
    "name": "getPlatformStats",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {"name": "totalArticles", "type": "uint256"},
      {"name": "totalComments", "type": "uint256"}
    ]
  },
  {
    "type": "function",
    "name": "getUserPoints",
    "stateMutability": "view",
    "inputs": [{"name": "_user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  },
  {
    "type": "function",
    "name": "hasUserUpvotedArticle",
    "stateMutability": "view",
    "inputs": [
      {"name": "_user", "type": "address"},
      {"name": "_articleId", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "type": "function",
    "name": "hasUserUpvotedComment",
    "stateMutability": "view",
    "inputs": [
      {"name": "_user", "type": "address"},
      {"name": "_commentId", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "type": "function",
    "name": "hasUpvotedArticle",
    "stateMutability": "view",
    "inputs": [
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "type": "function",
    "name": "hasUpvotedComment",
    "stateMutability": "view",
    "inputs": [
      {"name": "", "type": "address"},
      {"name": "", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}]
  },
  {
    "type": "function",
    "name": "postComment",
    "stateMutability": "nonpayable",
    "inputs": [
      {"name": "_articleId", "type": "uint256"},
      {"name": "_ipfsHash", "type": "string"}
    ],
    "outputs": []
  },
  {
    "type": "function",
    "name": "setDisplayName",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_newName", "type": "string"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "submitArticle",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_ipfsHash", "type": "string"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "upvoteArticle",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_articleId", "type": "uint256"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "upvoteComment",
    "stateMutability": "nonpayable",
    "inputs": [{"name": "_commentId", "type": "uint256"}],
    "outputs": []
  },
  {
    "type": "function",
    "name": "userPoints",
    "stateMutability": "view",
    "inputs": [{"name": "", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}]
  }
]