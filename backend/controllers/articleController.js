import { PrismaClient } from '@prisma/client';
import { scrapeArticle } from '../services/scraper.js';
import { summarizeArticle, extractFullContent } from '../services/summarizer.js';
import { uploadToIPFS } from '../services/ipfs.js';

const prisma = new PrismaClient();

// Get all curated articles (on-chain)
export const getAllArticles = async (req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      where: { onChain: true },
      orderBy: { createdAt: 'desc' },
      include: { 
        comments: {
          where: { parentId: null }, // Only top-level comments
          include: {
            replies: true
          }
        }
      }
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
};

// Get article by ID
export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const article = await prisma.article.findUnique({
      where: { id },
      include: { 
        comments: {
          where: { parentId: null },
          orderBy: { createdAt: 'desc' },
          include: {
            replies: {
              orderBy: { createdAt: 'asc' }
            }
          }
        }
      }
    });
    
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    res.json(article);
  } catch (error) {
    next(error);
  }
};

// Get article by URL
export const getArticleByUrl = async (req, res, next) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    const article = await prisma.article.findUnique({
      where: { articleUrl: url },
      include: { 
        comments: {
          where: { parentId: null },
          include: {
            replies: true
          }
        }
      }
    });
    
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }
    
    res.json(article);
  } catch (error) {
    next(error);
  }
};

// STEP 1: Scrape and summarize article
export const scrapeAndSummarize = async (req, res, next) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    const existing = await prisma.article.findUnique({
      where: { articleUrl: url }
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Article already curated', 
        article: existing 
      });
    }
    
    console.log('🔍 Scraping article:', url);
    const scrapedData = await scrapeArticle(url);
    
    console.log('🤖 Summarizing article with OpenAI...');
    const { summary, detailedSummary, cardJson } = await summarizeArticle(scrapedData);
    
    // Extract structured content if available
    let structuredContent = {
      keyPoints: [],
      sections: [],
      statistics: []
    };
    
    if (scrapedData.fullContent) {
      structuredContent = await extractFullContent(scrapedData.fullContent, scrapedData);
    }
    
    res.status(200).json({
      message: 'Article scraped and summarized successfully',
      preview: {
        title: scrapedData.title,
        summary: summary,
        detailedSummary: detailedSummary,
        fullContent: scrapedData.fullContent,
        keyPoints: structuredContent.keyPoints,
        sections: structuredContent.sections,
        statistics: structuredContent.statistics,
        imageUrl: scrapedData.image,
        articleUrl: scrapedData.url,
        cardJson: cardJson,
        author: scrapedData.author,
        publisher: scrapedData.publisher,
        date: scrapedData.date
      }
    });
  } catch (error) {
    console.error('Scrape error:', error.message);
    next(error);
  }
};

// STEP 2: Prepare article for curation
export const prepareArticleForCuration = async (req, res, next) => {
  try {
    const { 
      title, 
      summary, 
      detailedSummary,
      fullContent,
      keyPoints,
      sections,
      statistics,
      imageUrl, 
      articleUrl, 
      cardJson, 
      author, 
      publisher, 
      date 
    } = req.body;
    
    if (!articleUrl || !title || !summary) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const existing = await prisma.article.findUnique({
      where: { articleUrl }
    });
    
    if (existing) {
      return res.status(400).json({ 
        error: 'Article already exists',
        article: existing 
      });
    }
    
    console.log('💾 Saving to database...');
    
    const article = await prisma.article.create({
      data: {
        title,
        summary,
        detailedSummary: detailedSummary || summary,
        fullContent: fullContent || '',
        keyPoints: keyPoints || [],
        sections: sections || [],
        statistics: statistics || [],
        imageUrl,
        articleUrl,
        cardJson,
        ipfsHash: null,
        onChain: false
      }
    });
    
    console.log('✅ Article saved:', article.id);
    
    res.json({ 
      article,
      message: 'Article saved to database (blockchain integration pending)'
    });
  } catch (error) {
    console.error('Database save error:', error.message);
    next(error);
  }
};

// STEP 3: Mark article as on-chain
export const markOnChain = async (req, res, next) => {
  try {
    const { articleUrl, articleId, curator, ipfsHash } = req.body;
    
    if (!articleUrl || !articleId || !curator || !ipfsHash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await prisma.article.update({
      where: { articleUrl },
      data: { 
        onChain: true, 
        articleId: parseInt(articleId),
        curator,
        ipfsHash
      }
    });
    
    console.log('✅ Article marked as on-chain:', articleUrl);
    res.json(updated);
  } catch (error) {
    console.error('Mark on-chain error:', error.message);
    next(error);
  }
};

// Upvote article (wallet-optional)
export const upvoteArticle = async (req, res, next) => {
  try {
    const { articleId, userId } = req.body; // userId can be wallet or session ID
    
    if (!articleId || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const article = await prisma.article.findUnique({
      where: { id: articleId }
    });
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Check if already upvoted
    if (article.upvotedBy.includes(userId)) {
      return res.status(400).json({ error: 'Already upvoted this article' });
    }
    
    // Add upvote
    const updated = await prisma.article.update({
      where: { id: articleId },
      data: {
        upvotes: { increment: 1 },
        upvotedBy: { push: userId }
      }
    });
    
    // TODO: When blockchain is enabled, emit event here
    // await emitUpvoteEvent(article.articleId, userId);
    
    res.json({ 
      success: true, 
      upvotes: updated.upvotes,
      message: 'Upvote recorded (blockchain event will be emitted when enabled)'
    });
  } catch (error) {
    console.error('Upvote error:', error.message);
    next(error);
  }
};

// Sync upvotes from blockchain
export const syncUpvotes = async (req, res, next) => {
  try {
    const { articleUrl, upvotes } = req.body;
    
    if (!articleUrl || upvotes === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await prisma.article.update({
      where: { articleUrl },
      data: { upvotes: parseInt(upvotes) }
    });
    
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Delete article
export const deleteArticle = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.article.delete({
      where: { id }
    });
    
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Get ALL articles (including pending)
export const getAllArticlesIncludingPending = async (req, res, next) => {
  try {
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        comments: {
          where: { parentId: null },
          include: {
            replies: true
          }
        }
      }
    });
    res.json(articles);
  } catch (error) {
    next(error);
  }
};