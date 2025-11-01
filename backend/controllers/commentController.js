import { PrismaClient } from '@prisma/client';
import { uploadToIPFS } from '../services/ipfs.js';

const prisma = new PrismaClient();

// Helper function to get user display name
const getUserDisplayName = async (walletAddress) => {
  try {
    if (!walletAddress || walletAddress.startsWith('anon_')) {
      return 'Anonymous';
    }
    
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    });
    
    return user?.displayName || `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
  } catch (error) {
    console.error('Error fetching user display name:', error);
    return `${walletAddress.substring(0, 6)}...${walletAddress.substring(38)}`;
  }
};

// Add comment (supports nested replies)
export const addComment = async (req, res, next) => {
  try {
    const { articleId, articleUrl, content, author, authorName, parentId } = req.body;
    
    if (!articleId || !articleUrl || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validate parent comment exists if this is a reply
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentId }
      });
      
      if (!parentComment) {
        return res.status(404).json({ error: 'Parent comment not found' });
      }
    }
    
    // Use provided authorName or fetch from database
    const finalAuthorName = authorName || await getUserDisplayName(author);
    
    const comment = await prisma.comment.create({
      data: { 
        articleId, 
        articleUrl, 
        content, 
        author,
        authorName: finalAuthorName,
        parentId: parentId || null,
        onChain: false,
        upvotedBy: []
      },
      include: {
        replies: true
      }
    });
    
    console.log(`✅ Comment created with ID: ${comment.id}${parentId ? ` (reply to ${parentId})` : ''}`);
    
    res.status(201).json({ 
      ...comment,
      id: comment.id // Ensure ID is returned
    });
  } catch (error) {
    console.error('Add comment error:', error);
    next(error);
  }
};

// Upload comment to IPFS
export const uploadCommentToIPFS = async (req, res, next) => {
  try {
    const { commentId, content, author, authorName, articleUrl } = req.body;
    
    if (!commentId || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Use provided authorName or fetch from database
    const finalAuthorName = authorName || await getUserDisplayName(author);
    
    const metadata = {
      content,
      author,
      authorName: finalAuthorName,
      articleUrl,
      timestamp: new Date().toISOString()
    };
    
    const ipfsHash = await uploadToIPFS(metadata);
    
    await prisma.comment.update({
      where: { id: commentId },
      data: { ipfsHash }
    });
    
    console.log(`📤 Comment ${commentId} uploaded to IPFS: ${ipfsHash}`);
    
    res.json({ ipfsHash, commentId });
  } catch (error) {
    next(error);
  }
};

// Mark comment as on-chain
export const markCommentOnChain = async (req, res, next) => {
  try {
    const { commentId, onChainCommentId, ipfsHash } = req.body;
    
    if (!commentId || !onChainCommentId || !ipfsHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { 
        onChain: true,
        commentId: parseInt(onChainCommentId),
        ipfsHash
      }
    });
    
    console.log(`⛓ Comment ${commentId} marked as on-chain with ID ${onChainCommentId}`);
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Get comments by article URL (with nested replies)
export const getCommentsByArticleUrl = async (req, res, next) => {
  try {
    const { articleUrl } = req.query;
    
    if (!articleUrl) {
      return res.status(400).json({ error: 'articleUrl parameter is required' });
    }
    
    const comments = await prisma.comment.findMany({
      where: { 
        articleUrl,
        parentId: null
      },
      orderBy: { createdAt: 'desc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    
    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// Upvote comment (wallet-optional)
export const upvoteComment = async (req, res, next) => {
  try {
    const { commentId, userId } = req.body;
    
    if (!commentId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const comment = await prisma.comment.findUnique({
      where: { id: commentId }
    });
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Check if already upvoted
    const upvotedByArray = Array.isArray(comment.upvotedBy) ? comment.upvotedBy : [];
    const hasUpvoted = upvotedByArray.some(vote => 
      typeof vote === 'string' ? vote === userId : vote.address === userId
    );
    
    if (hasUpvoted) {
      return res.status(400).json({ error: 'Already upvoted this comment' });
    }
    
    // Get user's display name
    const displayName = await getUserDisplayName(userId);
    
    // Add upvote with user info
    const newUpvote = {
      address: userId,
      name: displayName,
      timestamp: new Date().toISOString()
    };
    
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        upvotes: { increment: 1 },
        upvotedBy: { push: newUpvote }
      }
    });
    
    res.json({ 
      success: true, 
      upvotes: updated.upvotes,
      message: 'Upvote recorded'
    });
  } catch (error) {
    console.error('Upvote comment error:', error.message);
    next(error);
  }
};

// Sync comment upvotes from blockchain (uses MongoDB ID)
export const syncCommentUpvotes = async (req, res, next) => {
  try {
    const { commentId, upvotes } = req.body;
    
    if (!commentId || upvotes === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    console.log(`🔄 Syncing upvotes for comment ${commentId}: ${upvotes}`);
    
    // commentId is the MongoDB ID, not the on-chain ID
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { upvotes: parseInt(upvotes) }
    });
    
    console.log(`✅ Comment ${commentId} upvotes synced: ${upvotes}`);
    
    res.json(updated);
  } catch (error) {
    console.error('Sync comment upvotes error:', error);
    next(error);
  }
};

// Get all replies for a comment
export const getCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    
    const replies = await prisma.comment.findMany({
      where: { parentId: commentId },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(replies);
  } catch (error) {
    next(error);
  }
};