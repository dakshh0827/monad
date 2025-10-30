import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE = 'http://localhost:5000/api';

export default function ArticleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [article, setArticle] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upvoting, setUpvoting] = useState(false);
  const [commenting, setCommenting] = useState(false);
  const [error, setError] = useState(null);
  const [userId] = useState(() => {
    // Generate or retrieve session ID for anonymous users
    let id = localStorage.getItem('userId');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('userId', id);
    }
    return id;
  });

  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_BASE}/articles/${id}`);
      setArticle(res.data);
    } catch (err) {
      setError('Failed to load article');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update article state without refetching
  const updateArticleState = (updates) => {
    setArticle(prev => ({ ...prev, ...updates }));
  };

  const handleUpvote = async () => {
    setUpvoting(true);
    const loadingToast = toast.loading('Processing upvote...');
    
    try {
      await axios.post(`${API_BASE}/articles/upvote`, {
        articleId: article.id,
        userId: userId
      });
      
      // Update state directly instead of refetching
      updateArticleState({
        upvotes: article.upvotes + 1,
        upvotedBy: [...article.upvotedBy, userId]
      });
      
      toast.success('Upvote successful!', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upvote failed', { id: loadingToast });
    } finally {
      setUpvoting(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    
    setCommenting(true);
    const loadingToast = toast.loading('Posting comment...');
    
    try {
      const res = await axios.post(`${API_BASE}/comments`, {
        articleId: article.id,
        articleUrl: article.articleUrl,
        content: commentText.trim(),
        author: userId,
        authorName: 'Anonymous User'
      });
      
      // Backend returns the comment directly
      const newComment = {
        ...res.data,
        replies: res.data.replies || []
      };
      
      updateArticleState({
        comments: [...(article.comments || []), newComment]
      });
      
      setCommentText("");
      toast.success('Comment posted!', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Comment failed', { id: loadingToast });
    } finally {
      setCommenting(false);
    }
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    
    const loadingToast = toast.loading('Posting reply...');
    
    try {
      const res = await axios.post(`${API_BASE}/comments`, {
        articleId: article.id,
        articleUrl: article.articleUrl,
        content: replyText.trim(),
        author: userId,
        authorName: 'Anonymous User',
        parentId: parentId
      });
      
      // Backend returns the comment directly in res.data
      const newReply = res.data;
      
      const updatedComments = article.comments.map(comment => {
        if (comment.id === parentId) {
          return {
            ...comment,
            replies: [...(comment.replies || []), newReply]
          };
        }
        return comment;
      });
      
      updateArticleState({ comments: updatedComments });
      
      setReplyText("");
      setReplyingTo(null);
      toast.success('Reply posted!', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reply failed', { id: loadingToast });
    }
  };

  const handleUpvoteComment = async (commentId) => {
    const loadingToast = toast.loading('Processing upvote...');
    
    try {
      await axios.post(`${API_BASE}/comments/upvote`, {
        commentId: commentId,
        userId: userId
      });
      
      // Update comment upvote count in state (works for both comments and replies)
      const updateCommentsUpvote = (comments) => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return { 
              ...comment, 
              upvotes: comment.upvotes + 1,
              upvotedBy: [...(comment.upvotedBy || []), userId]
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return { ...comment, replies: updateCommentsUpvote(comment.replies) };
          }
          return comment;
        });
      };
      
      updateArticleState({
        comments: updateCommentsUpvote(article.comments || [])
      });
      
      toast.success('Comment upvoted!', { id: loadingToast });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upvote failed', { id: loadingToast });
    }
  };

  const renderComment = (comment, isReply = false) => {
    const hasUpvoted = comment.upvotedBy?.includes(userId);
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-12 mt-3' : 'mb-4'} bg-gray-50 border border-gray-200 rounded-lg p-4`}>
        <div className="flex items-start justify-between mb-2">
          <span className="font-medium text-gray-700">
            {comment.authorName || 'Anonymous'}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpvoteComment(comment.id)}
              disabled={hasUpvoted}
              className={`flex items-center gap-1 text-sm ${
                hasUpvoted 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
            >
              👍 {comment.upvotes}
            </button>
            {comment.onChain && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                ⛓️ On-chain
              </span>
            )}
          </div>
        </div>
        
        <p className="text-gray-700 mb-2">{comment.content}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{new Date(comment.createdAt).toLocaleString()}</span>
          {!isReply && (
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-blue-600 hover:text-blue-800"
            >
              Reply
            </button>
          )}
        </div>
        
        {/* Reply Form */}
        {replyingTo === comment.id && (
          <div className="mt-3 bg-white p-3 rounded border border-gray-300">
            <textarea
              className="w-full border border-gray-300 p-2 rounded focus:outline-none focus:border-blue-500 resize-none"
              rows={2}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReply(comment.id)}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm"
              >
                Post Reply
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                className="bg-gray-300 text-gray-700 px-4 py-1 rounded hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {/* Nested Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading article...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="bg-red-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-lg max-w-2xl mx-auto">
            <p className="font-medium">❌ {error || 'Article not found'}</p>
            <button 
              onClick={() => navigate('/curated')}
              className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
            >
              Back to Articles
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const canUpvote = !article.upvotedBy.includes(userId);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <button 
            onClick={() => navigate('/curated')}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Articles
          </button>
          
          {/* Article Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {article.imageUrl && (
              <img 
                src={article.imageUrl} 
                alt={article.title}
                className="w-full h-96 object-cover" 
              />
            )}
            
            <div className="p-8">
              <h1 className="text-4xl font-bold mb-4 text-gray-900">
                {article.title}
              </h1>
              
              {/* Short Summary */}
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                <h3 className="font-bold text-blue-900 mb-2">📋 Quick Summary</h3>
                <p className="text-lg text-blue-800 leading-relaxed">
                  {article.summary}
                </p>
              </div>
              
              {/* Detailed Summary */}
              {article.detailedSummary && (
                <div className="prose prose-lg max-w-none mb-6">
                  <h2 className="text-2xl font-bold mb-4">📰 Detailed Analysis</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {article.detailedSummary}
                  </p>
                </div>
              )}
              
              {/* Key Points */}
              {article.keyPoints && article.keyPoints.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-3">🔑 Key Takeaways</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {article.keyPoints.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Statistics */}
              {article.statistics && article.statistics.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-3">📊 Key Statistics</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {article.statistics.map((stat, idx) => (
                      <div key={idx} className="bg-gray-100 p-4 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">{stat.value}</div>
                        <div className="text-sm text-gray-600">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Sections */}
              {article.sections && article.sections.length > 0 && (
                <div className="mb-6">
                  {article.sections.map((section, idx) => (
                    <div key={idx} className="mb-4">
                      <h3 className="text-xl font-bold mb-2">{section.heading}</h3>
                      <p className="text-gray-700 leading-relaxed">{section.content}</p>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Full Content */}
              {article.fullContent && (
                <div className="prose max-w-none mb-6">
                  <h3 className="text-xl font-bold mb-3">📖 Full Article Content</h3>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {article.fullContent}
                  </div>
                </div>
              )}
              
              {/* On-Chain Info */}
              {article.onChain && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 mb-6">
                  <h3 className="font-bold text-green-800 mb-2">⛓️ Blockchain Information</h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Curator:</strong> {article.curator}</p>
                    <p><strong>IPFS Hash:</strong> {article.ipfsHash}</p>
                    <p><strong>On-chain ID:</strong> {article.articleId}</p>
                  </div>
                </div>
              )}
              
              {/* Original Link */}
              <a
                href={article.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mb-6"
              >
                📖 Read Full Original Article
              </a>
              
              {/* Upvote Section */}
              <div className="border-t-2 border-gray-200 pt-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-3xl font-bold text-gray-900">
                      {article.upvotes}
                    </span>
                    <span className="text-gray-600 ml-2">upvotes</span>
                  </div>
                  
                  <button 
                    className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                      canUpvote && !upvoting
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={handleUpvote}
                    disabled={!canUpvote || upvoting}
                  >
                    {upvoting ? '⏳ Upvoting...' : canUpvote ? '👍 Upvote' : '✓ Already Upvoted'}
                  </button>
                </div>
              </div>
              
              {/* Comments Section */}
              <div className="border-t-2 border-gray-200 pt-8">
                <h2 className="text-2xl font-bold mb-6">
                  💬 Comments ({article.comments?.length || 0})
                </h2>
                
                {/* Comment Form */}
                <form onSubmit={handleComment} className="mb-8">
                  <textarea
                    className="w-full border-2 border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    rows={4}
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Share your thoughts..."
                    disabled={commenting}
                  />
                  <button 
                    type="submit"
                    className="mt-3 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                    disabled={commenting || !commentText.trim()}
                  >
                    {commenting ? '⏳ Posting...' : '✉️ Post Comment'}
                  </button>
                </form>
                
                {/* Comments List */}
                <div className="space-y-4">
                  {article.comments && article.comments.length > 0 ? (
                    article.comments.map(comment => renderComment(comment))
                  ) : (
                    <p className="text-gray-500 text-center py-8">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}