import express from 'express';
import * as commentController from '../controllers/commentController.js';

const router = express.Router();

// Add comment (supports replies)
router.post('/', commentController.addComment);

// Upload comment to IPFS
router.post('/upload-ipfs', commentController.uploadCommentToIPFS);

// Mark comment as on-chain
router.post('/mark-onchain', commentController.markCommentOnChain);

// Get comments by article URL
router.get('/by-article', commentController.getCommentsByArticleUrl);

// Get replies for a comment
router.get('/:commentId/replies', commentController.getCommentReplies);

// Upvote comment (wallet-optional for testing)
router.post('/upvote', commentController.upvoteComment);

// Sync comment upvotes from blockchain
router.post('/sync-upvotes', commentController.syncCommentUpvotes);

export default router;