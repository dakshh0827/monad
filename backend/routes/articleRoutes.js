import express from 'express';
import * as articleController from '../controllers/articleController.js';

const router = express.Router();

// Get all curated (on-chain) articles
router.get('/', articleController.getAllArticles);

// Get ALL articles (including pending)
router.get('/all', articleController.getAllArticlesIncludingPending);

// Get article by MongoDB ID
router.get('/:id', articleController.getArticleById);

// Get article by original URL
router.get('/by-url', articleController.getArticleByUrl);

// STEP 1: Scrape and preview
router.post('/scrape', articleController.scrapeAndSummarize);

// STEP 2: Prepare for curation
router.post('/prepare', articleController.prepareArticleForCuration);

// STEP 3: Mark as on-chain
router.post('/mark-onchain', articleController.markOnChain);

// Upvote article (wallet-optional for testing)
router.post('/upvote', articleController.upvoteArticle);

// Sync upvotes from blockchain
router.post('/sync-upvotes', articleController.syncUpvotes);

// Delete article
router.delete('/:id', articleController.deleteArticle);

export default router;