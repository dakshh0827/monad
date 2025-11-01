import { create } from "zustand";
import axios from "axios";

const API_BASE = 'http://localhost:5000/api';

export const useArticleStore = create((set, get) => ({
  // 1. STATE
  articles: [],
  selectedArticle: null,
  userPoints: 0,
  displayName: '',
  
  // 2. SETTERS
  setUserPoints: (points) => set({ userPoints: points }),
  setDisplayName: (name) => set({ displayName: name }),
  
  // 3. API FUNCTIONS
  
  // Load ALL articles (on-chain and pending)
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
  
  // Mark article as on-chain in DB
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

  // Sync article upvotes to database
  syncArticleUpvotesDB: async (articleUrl, upvotes) => {
     try {
        await axios.post(`${API_BASE}/articles/sync-upvotes`, {
          articleUrl,
          upvotes
        });
        console.log('✅ Article upvotes synced to DB');
     } catch (error) {
        console.error('DB sync upvotes error:', error);
        throw new Error(error.message || 'Failed to sync upvotes in DB');
     }
  },
  
  // Prepare comment for blockchain (creates in DB, uploads to IPFS)
  prepareCommentForChain: async ({ articleId, articleUrl, content, author, authorName, parentId }) => {
    try {
      console.log('💬 Preparing comment...');
      
      // Step 1: Create comment in database
      const res1 = await axios.post(`${API_BASE}/comments`, {
        articleId, // MongoDB ID
        articleUrl,
        content,
        author,
        authorName,
        parentId: parentId || null
      });
      const commentMongoId = res1.data.id;
      console.log('📝 Comment saved to DB:', commentMongoId);
      
      // Step 2: Upload to IPFS
      const res2 = await axios.post(`${API_BASE}/comments/upload-ipfs`, {
        commentId: commentMongoId,
        content,
        author,
        authorName,
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
  
  // Mark comment as on-chain in DB
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

  // Sync comment upvotes to database (uses MongoDB ID, not on-chain ID)
  syncCommentUpvotesDB: async (commentMongoId, upvotes) => {
    try {
      await axios.post(`${API_BASE}/comments/sync-upvotes`, {
        commentId: commentMongoId, // This is the MongoDB ID
        upvotes
      });
      console.log('✅ Comment upvotes synced to DB');
    } catch (error) {
      console.error('DB sync comment upvotes error:', error);
      throw new Error(error.message || 'Failed to sync comment upvotes in DB');
    }
  },

}));