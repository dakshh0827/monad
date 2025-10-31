import express from 'express';
import * as articleController from '../controllers/articleController.js';

const router = express.Router();

// IMPORTANT: Order matters! Put specific routes BEFORE parameterized routes

// Scrape article (Step 1)
router.post('/scrape', articleController.scrapeAndSummarize);

// Prepare article for curation (Step 2 - saves to DB)
router.post('/prepare', articleController.prepareArticleForCuration);

// Upload article to IPFS
router.post('/upload-ipfs', articleController.uploadArticleToIPFS);

// Mark article as on-chain (Step 3)
router.post('/mark-onchain', articleController.markOnChain);

// Get all articles (including pending)
router.get('/all', articleController.getAllArticlesIncludingPending);

// Get article by URL - MUST come before /:id route
router.get('/by-url', articleController.getArticleByUrl);

// Upvote article (wallet-optional for testing)
router.post('/upvote', articleController.upvoteArticle);

// Sync upvotes from blockchain
router.post('/sync-upvotes', articleController.syncUpvotes);

// Get article by ID - MUST come after /by-url and other specific routes
router.get('/:id', articleController.getArticleById);

// Delete article
router.delete('/:id', articleController.deleteArticle);

export default router;