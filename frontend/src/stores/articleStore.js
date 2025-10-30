import { create } from "zustand";
import axios from "axios";
// Ethers is no longer needed here!
// wagmi and web3modal will handle all wallet/contract logic in your components.

const API_BASE = 'http://localhost:5000/api';

export const useArticleStore = create((set, get) => ({
  // 1. STATE: Simplified state.
  // We no longer store the wallet, provider, or contract.
  // wagmi hooks provide these directly to your components.
  articles: [],
  selectedArticle: null,
  userPoints: 0,
  displayName: '',
  
  // 2. SETTERS:
  // Your components (like Navbar) will use wagmi's `useReadContract` hook
  // to get data, and then call these setters to update the global state.
  setUserPoints: (points) => set({ userPoints: points }),
  setDisplayName: (name) => set({ displayName: name }),
  
  // 3. API (AXIOS) FUNCTIONS:
  // These functions remain, as they talk to your backend API.
  
  // Load ALL articles (on-chain and pending)
  // (You had `loadArticles` but CuratedArticlesPage.jsx uses `/all`)
  loadAllArticles: async () => {
    try {
      const res = await axios.get(`${API_BASE}/articles/all`);
      set({ articles: res.data });
      return res.data;
    } catch (error) {
      console.error('Load all articles error:', error);
      throw new Error('Failed to load articles');
    }
  },
  
  // Load single article
  loadArticle: async (id) => {
    try {
      set({ selectedArticle: null }); // Clear previous
      const res = await axios.get(`${API_BASE}/articles/${id}`);
      set({ selectedArticle: res.data });
      return res.data;
    } catch (error) {
      console.error('Load article error:', error);
      throw new Error('Failed to load article');
    }
  },
  
  // 4. REFACTORED "WRITE" FUNCTIONS
  // These are now split. The component will do the contract write.
  // The store will handle the related API (axios) calls.
  
  /**
   * Part 1 of submitArticle: Calls the backend API to mark as on-chain.
   * The component will call this *after* the `submitArticle` contract write is successful.
   */
  markArticleOnChainDB: async (articleUrl, articleId, curator, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/articles/mark-onchain`, {
        articleUrl,
        articleId,
        curator,
        ipfsHash
      });
      console.log('✅ Article marked as on-chain in DB');
    } catch (error) {
       console.error('DB mark-onchain error:', error);
       throw new Error(error.message || 'Failed to mark article on-chain in DB');
    }
  },

  /**
   * Part 1 of upvoteArticle: Syncs the new upvote count to the database.
   * The component will call this *after* the `upvoteArticle` contract write is successful.
   */
  syncArticleUpvotesDB: async (articleUrl, upvotes) => {
     try {
        await axios.post(`${API_BASE}/articles/sync-upvotes`, {
          articleUrl,
          upvotes
        });
     } catch (error) {
        console.error('DB sync upvotes error:', error);
        throw new Error(error.message || 'Failed to sync upvotes in DB');
     }
  },
  
  /**
   * Part 1 of postComment: Creates comment in DB, uploads to IPFS, and gets on-chain ID.
   * Returns data needed for the component to make the contract call.
   */
  prepareCommentForChain: async ({ articleId, articleUrl, content, author }) => {
    try {
      console.log('💬 Preparing comment...');
      
      // Step 1: Create comment in database
      const res1 = await axios.post(`${API_BASE}/comments`, {
        articleId, // This is the MongoDB ID
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
      
      // Return data needed for the contract write
      return { commentMongoId, onChainArticleId, ipfsHash };
      
    } catch (error) {
      console.error('Prepare comment error:', error);
      throw new Error(error.message || 'Failed to prepare comment');
    }
  },
  
  /**
   * Part 2 of postComment: Marks the comment as on-chain in the DB.
   * The component will call this *after* the `postComment` contract write is successful.
   */
  markCommentOnChainDB: async (commentMongoId, onChainCommentId, ipfsHash) => {
    try {
      await axios.post(`${API_BASE}/comments/mark-onchain`, {
        commentId: commentMongoId,
        onChainCommentId,
        ipfsHash
      });
      console.log('✅ Comment marked as on-chain in DB');
    } catch (error) {
      console.error('DB mark-onchain error:', error);
      throw new Error(error.message || 'Failed to mark comment on-chain in DB');
    }
  },

  /**
   * Part 1 of upvoteComment: Syncs the new upvote count to the database.
   * The component will call this *after* the `upvoteComment` contract write is successful.
   */
  syncCommentUpvotesDB: async (commentMongoId, upvotes) => {
    try {
      await axios.post(`${API_BASE}/comments/sync-upvotes`, {
        commentId: commentMongoId,
        upvotes
      });
    } catch (error)
    {
      console.error('DB sync comment upvotes error:', error);
      throw new Error(error.message || 'Failed to sync comment upvotes in DB');
    }
  },
  
  // 5. REMOVED FUNCTIONS:
  // - connectWallet (Handled by web3modal)
  // - disconnectWallet (Handled by wagmi's `useDisconnect` hook)
  // - setDisplayName (Component will use `useWriteContract` hook)
  // - canUpvoteArticle (Component will use `useReadContract` hook)
  // - canUpvoteComment (Component will use `useReadContract` hook)
  // - getPlatformStats (Component will use `useReadContract` hook)

}));