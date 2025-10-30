import { PrismaClient } from '@prisma/client';
import { uploadToIPFS } from '../services/ipfs.js';

const prisma = new PrismaClient();

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
    
    const comment = await prisma.comment.create({
      data: { 
        articleId, 
        articleUrl, 
        content, 
        author,
        authorName: authorName || 'Anonymous',
        parentId: parentId || null,
        onChain: false 
      },
      include: {
        replies: true
      }
    });
    
    res.status(201).json(comment);
  } catch (error) {
    console.error('Add comment error:', error);
    next(error);
  }
};

// Upload comment to IPFS
export const uploadCommentToIPFS = async (req, res, next) => {
  try {
    const { commentId, content, author, articleUrl } = req.body;
    
    if (!commentId || !content || !author) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const metadata = {
      content,
      author,
      articleUrl,
      timestamp: new Date().toISOString()
    };
    
    const ipfsHash = await uploadToIPFS(metadata);
    
    await prisma.comment.update({
      where: { id: commentId },
      data: { ipfsHash }
    });
    
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
        parentId: null // Only top-level comments
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
    const { commentId, userId } = req.body; // userId can be wallet or session ID
    
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
    if (comment.upvotedBy.includes(userId)) {
      return res.status(400).json({ error: 'Already upvoted this comment' });
    }
    
    // Add upvote
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        upvotes: { increment: 1 },
        upvotedBy: { push: userId }
      }
    });
    
    // TODO: When blockchain is enabled, emit event here
    // await emitCommentUpvoteEvent(comment.commentId, userId);
    
    res.json({ 
      success: true, 
      upvotes: updated.upvotes,
      message: 'Upvote recorded (blockchain event will be emitted when enabled)'
    });
  } catch (error) {
    console.error('Upvote comment error:', error.message);
    next(error);
  }
};

// Sync comment upvotes from blockchain
export const syncCommentUpvotes = async (req, res, next) => {
  try {
    const { commentId, upvotes } = req.body;
    
    if (!commentId || upvotes === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { upvotes: parseInt(upvotes) }
    });
    
    res.json(updated);
  } catch (error) {
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