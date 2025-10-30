import { create } from "zustand";
import axios from "axios";
import { ethers } from "ethers";

const API_BASE = 'http://localhost:5000/api';

// Contract ABI - Matching your actual smart contract
const CONTRACT_ABI = [
  "function submitArticle(string memory ipfsHash) external",
  "function upvoteArticle(uint256 articleId) external",
  "function postComment(uint256 articleId, string memory ipfsHash) external",
  "function upvoteComment(uint256 commentId) external",
  "function getArticle(uint256 articleId) external view returns (string memory ipfsHash, address curator, uint256 upvoteCount, uint256 timestamp)",
  "function getComment(uint256 commentId) external view returns (string memory ipfsHash, uint256 articleId, address commenter, uint256 upvoteCount, uint256 timestamp)",
  "function getArticleComments(uint256 articleId) external view returns (uint256[] memory)",
  "function hasUserUpvotedArticle(address user, uint256 articleId) external view returns (bool)",
  "function hasUserUpvotedComment(address user, uint256 commentId) external view returns (bool)",
  "function getUserPoints(address user) external view returns (uint256)",
  "function getPlatformStats() external view returns (uint256 totalArticles, uint256 totalComments)",
  "function getArticlesBatch(uint256 startId, uint256 count) external view returns (uint256[] memory ids, address[] memory curators, uint256[] memory upvoteCounts, uint256[] memory timestamps)",
  "function setDisplayName(string memory newName) external",
  "function getDisplayName(address user) external view returns (string memory)",
  "function articleCount() external view returns (uint256)",
  "function commentCount() external view returns (uint256)",
  "event ArticleSubmitted(uint256 indexed articleId, string ipfsHash, address indexed curator, uint256 timestamp)",
  "event CommentPosted(uint256 indexed articleId, uint256 indexed commentId, string ipfsHash, address indexed commenter, uint256 timestamp)",
  "event ArticleUpvoted(uint256 indexed articleId, address indexed voter, address indexed curator, uint256 newUpvoteCount)",
  "event CommentUpvoted(uint256 indexed commentId, uint256 indexed articleId, address indexed voter, address commenter, uint256 newUpvoteCount)",
  "event PointsAwarded(address indexed user, uint256 pointsEarned, uint256 totalPoints)",
  "event DisplayNameSet(address indexed user, string displayName)"
];

const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";

export const useArticleStore = create((set, get) => ({
  articles: [],
  selectedArticle: null,
  wallet: null,
  contract: null,
  provider: null,
  userPoints: 0,
  displayName: '',
  
  // Connect wallet
  connectWallet: async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }
      
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      
      // Get user points and display name
      try {
        const points = await contract.getUserPoints(address);
        const name = await contract.getDisplayName(address);
        
        set({ 
          wallet: address, 
          contract,
          provider,
          userPoints: Number(points),
          displayName: name
        });
      } catch (err) {
        set({ 
          wallet: address, 
          contract,
          provider,
          userPoints: 0,
          displayName: ''
        });
      }
      
      console.log('✅ Wallet connected:', address);
      return address;
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw new Error('Failed to connect wallet');
    }
  },
  
  // Disconnect wallet
  disconnectWallet: () => {
    set({ 
      wallet: null, 
      contract: null,
      provider: null,
      userPoints: 0,
      displayName: ''
    });
  },
  
  // Set display name
  setDisplayName: async (name) => {
    const { contract, wallet } = get();
    
    if (!contract || !wallet) {
      throw new Error('Wallet not connected');
    }
    
    try {
      const tx = await contract.setDisplayName(name);
      await tx.wait();
      
      set({ displayName: name });
      console.log('✅ Display name set:', name);
    } catch (error) {
      console.error('Set display name error:', error);
      throw new Error(error.message || 'Failed to set display name');
    }
  },
  
  // Load curated articles (on-chain only)
  loadArticles: async () => {
    try {
      const res = await axios.get(`${API_BASE}/articles`);
      set({ articles: res.data });
      return res.data;
    } catch (error) {
      console.error('Load articles error:', error);
      throw new Error('Failed to load articles');
    }
  },
  
  // Load single article
  loadArticle: async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/articles/${id}`);
      set({ selectedArticle: res.data });
      return res.data;
    } catch (error) {
      console.error('Load article error:', error);
      throw new Error('Failed to load article');
    }
  },
  
  // Submit article to blockchain (assumes IPFS already done)
  submitArticle: async (articleUrl, ipfsHash) => {
    const { contract, wallet } = get();
    
    if (!contract || !wallet) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('📤 Submitting to blockchain...');
      
      // Submit to blockchain
      const tx = await contract.submitArticle(ipfsHash);
      console.log('⏳ Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);
      
      // Extract articleId from event using the new ethers v6 way
      let articleId = null;
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === 'ArticleSubmitted') {
            articleId = parsedLog.args.articleId.toString();
            break;
          }
        } catch (e) {
          // Skip logs that don't match
          continue;
        }
      }
      
      if (!articleId) {
        throw new Error('ArticleSubmitted event not found in transaction receipt');
      }
      
      console.log('📝 Article ID:', articleId);
      
      // Mark as on-chain in database
      await axios.post(`${API_BASE}/articles/mark-onchain`, {
        articleUrl,
        articleId,
        curator: wallet,
        ipfsHash
      });
      
      console.log('✅ Article marked as on-chain');
      return { articleId, ipfsHash };
    } catch (error) {
      console.error('Submit article error:', error);
      throw new Error(error.message || 'Failed to submit article');
    }
  },
  
  // Upvote article
  upvoteArticle: async (articleId, mongoId, articleUrl) => {
    const { contract, wallet } = get();
    
    if (!contract || !wallet) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('👍 Upvoting article:', articleId);
      
      const tx = await contract.upvoteArticle(articleId);
      console.log('⏳ Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Upvote confirmed');
      
      // Get updated upvote count from contract
      const article = await contract.getArticle(articleId);
      const upvotes = article.upvoteCount.toString();
      
      // Sync with database
      await axios.post(`${API_BASE}/articles/sync-upvotes`, {
        articleUrl,
        upvotes
      });
      
      // Update user points
      const points = await contract.getUserPoints(wallet);
      set({ userPoints: Number(points) });
      
      return upvotes;
    } catch (error) {
      console.error('Upvote error:', error);
      
      // Provide specific error messages
      if (error.message.includes('Already upvoted')) {
        throw new Error('You have already upvoted this article');
      } else if (error.message.includes('Cannot upvote your own')) {
        throw new Error('You cannot upvote your own article');
      } else {
        throw new Error(error.message || 'Failed to upvote article');
      }
    }
  },
  
  // Post comment
  postComment: async ({ articleId, articleUrl, content, author }) => {
    const { contract } = get();
    
    if (!contract) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('💬 Posting comment...');
      
      // Step 1: Create comment in database
      const res1 = await axios.post(`${API_BASE}/comments`, {
        articleId,
        articleUrl,
        content,
        author
      });
      
      const commentMongoId = res1.data.id;
      console.log('📝 Comment saved to DB:', commentMongoId);
      
      // Step 2: Upload to IPFS
      const res2 = await axios.post(`${API_BASE}/comments/upload-ipfs`, {
        commentId: commentMongoId,
        content,
        author,
        articleUrl
      });
      
      const { ipfsHash } = res2.data;
      console.log('📤 Comment uploaded to IPFS:', ipfsHash);
      
      // Step 3: Get on-chain article ID
      const article = await axios.get(`${API_BASE}/articles/by-url?url=${encodeURIComponent(articleUrl)}`);
      const onChainArticleId = article.data.articleId;
      
      if (!onChainArticleId) {
        throw new Error('Article not on-chain yet');
      }
      
      // Step 4: Post to blockchain
      const tx = await contract.postComment(onChainArticleId, ipfsHash);
      console.log('⏳ Transaction sent:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('✅ Comment posted on-chain');
      
      // Extract comment ID from event
      let onChainCommentId = null;
      
      for (const log of receipt.logs) {
        try {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          
          if (parsedLog && parsedLog.name === 'CommentPosted') {
            onChainCommentId = parsedLog.args.commentId.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!onChainCommentId) {
        throw new Error('CommentPosted event not found in transaction receipt');
      }
      
      console.log('📝 Comment ID:', onChainCommentId);
      
      // Step 5: Mark as on-chain in database
      await axios.post(`${API_BASE}/comments/mark-onchain`, {
        commentId: commentMongoId,
        onChainCommentId,
        ipfsHash
      });
      
      console.log('✅ Comment marked as on-chain');
      return { commentId: onChainCommentId, ipfsHash };
    } catch (error) {
      console.error('Post comment error:', error);
      throw new Error(error.message || 'Failed to post comment');
    }
  },
  
  // Upvote comment
  upvoteComment: async (commentId, commentMongoId) => {
    const { contract, wallet } = get();
    
    if (!contract || !wallet) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log('👍 Upvoting comment:', commentId);
      
      const tx = await contract.upvoteComment(commentId);
      console.log('⏳ Transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Comment upvote confirmed');
      
      // Get updated upvote count from contract
      const comment = await contract.getComment(commentId);
      const upvotes = comment.upvoteCount.toString();
      
      // Sync with database (you'll need to add this endpoint)
      await axios.post(`${API_BASE}/comments/sync-upvotes`, {
        commentId: commentMongoId,
        upvotes
      });
      
      // Update user points
      const points = await contract.getUserPoints(wallet);
      set({ userPoints: Number(points) });
      
      return upvotes;
    } catch (error) {
      console.error('Upvote comment error:', error);
      
      if (error.message.includes('Already upvoted')) {
        throw new Error('You have already upvoted this comment');
      } else if (error.message.includes('Cannot upvote your own')) {
        throw new Error('You cannot upvote your own comment');
      } else {
        throw new Error(error.message || 'Failed to upvote comment');
      }
    }
  },
  
  // Check upvote eligibility
  canUpvoteArticle: async (articleId, userAddress) => {
    const { contract } = get();
    
    if (!contract) {
      return false;
    }
    
    try {
      const hasUpvoted = await contract.hasUserUpvotedArticle(userAddress, articleId);
      const article = await contract.getArticle(articleId);
      const isCurator = article.curator.toLowerCase() === userAddress.toLowerCase();
      
      return !hasUpvoted && !isCurator;
    } catch (error) {
      console.error('Check upvote eligibility error:', error);
      return false;
    }
  },
  
  // Check comment upvote eligibility
  canUpvoteComment: async (commentId, userAddress) => {
    const { contract } = get();
    
    if (!contract) {
      return false;
    }
    
    try {
      const hasUpvoted = await contract.hasUserUpvotedComment(userAddress, commentId);
      const comment = await contract.getComment(commentId);
      const isCommenter = comment.commenter.toLowerCase() === userAddress.toLowerCase();
      
      return !hasUpvoted && !isCommenter;
    } catch (error) {
      console.error('Check comment upvote eligibility error:', error);
      return false;
    }
  },
  
  // Get platform stats
  getPlatformStats: async () => {
    const { contract } = get();
    
    if (!contract) {
      return { totalArticles: 0, totalComments: 0 };
    }
    
    try {
      const stats = await contract.getPlatformStats();
      return {
        totalArticles: Number(stats.totalArticles),
        totalComments: Number(stats.totalComments)
      };
    } catch (error) {
      console.error('Get platform stats error:', error);
      return { totalArticles: 0, totalComments: 0 };
    }
  }
}));