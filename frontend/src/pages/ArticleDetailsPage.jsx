import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useParams, useNavigate } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import toast from "react-hot-toast";
import { 
  useAccount, 
  useReadContract, 
  useWriteContract, 
  useWaitForTransactionReceipt, 
  useSwitchChain,
  useWatchContractEvent
} from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS, monadTestnet } from "../wagmiConfig";
import { decodeEventLog } from "viem";

export default function ArticleDetailPage() {
  const { id } = useParams(); // MongoDB Article ID
  const navigate = useNavigate();
  
  // --- Zustand Store ---
  const { 
    selectedArticle: article, 
    loadArticle, 
    setUserPoints, 
    prepareCommentForChain, 
    markCommentOnChainDB,
    syncArticleUpvotesDB,
    syncCommentUpvotesDB
  } = useArticleStore();
  
  // --- Local State ---
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCommentData, setPendingCommentData] = useState(null); // Store comment data between prepare and confirmation

  // --- Wagmi Hooks ---
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // --- ADD THE FOLLOWING BLOCK ---
  // Listener for new comments on the blockchain
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'CommentPosted',
    // Only listen if the article is on-chain
    enabled: !!article?.articleId, 
    onLogs(logs) {
      for (const log of logs) {
        try {
          const event = decodeEventLog({ 
            abi: CONTRACT_ABI, 
            data: log.data, 
            topics: log.topics 
          });

          // Check if the event is for the article we are currently viewing
          if (article?.articleId && event.args.articleId === BigInt(article.articleId)) {
            // Reload the article data (including comments) from your fast MongoDB cache
            loadArticle(id); 
            toast.success("New comment detected on-chain!");
          }
        } catch (decodeError) {
          // Ignore non-CommentPosted logs
          console.log("Skipping log:", decodeError);
        }
      }
    },
  });
// --- END OF NEW BLOCK ---
  
  // Separate write contracts for upvotes and comments
  const { 
    data: voteHash, 
    isPending: isVoting, 
    writeContract: writeVote,
    error: voteError 
  } = useWriteContract();
  
  const { 
    data: commentHash, 
    isPending: isCommenting, 
    writeContract: writeComment,
    error: commentError 
  } = useWriteContract();

  // Transaction receipts
  const { 
    isLoading: isVoteConfirming, 
    isSuccess: isVoteConfirmed, 
    data: voteReceipt 
  } = useWaitForTransactionReceipt({ hash: voteHash });
    
  const { 
    isLoading: isCommentConfirming, 
    isSuccess: isCommentConfirmed, 
    data: commentReceipt 
  } = useWaitForTransactionReceipt({ hash: commentHash });

  // --- Read Contract Data ---
  // Check if user has upvoted this article
  const { data: hasUpvotedArticle, refetch: refetchHasUpvotedArticle } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'hasUserUpvotedArticle',
    args: [address, article?.articleId],
    enabled: isConnected && !!article?.articleId,
  });

  // Get user's display name
  const { data: userDisplayName } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'getDisplayName',
    args: [address],
    enabled: isConnected && !!address,
  });

  // --- Load Article on Mount ---
  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadArticle(id);
      } catch (err) {
        setError('Failed to load article');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id, loadArticle]);

  // --- Helper: Check if user can upvote article ---
  const isCurator = isConnected && article?.curator?.toLowerCase() === address?.toLowerCase();
  const canUpvoteArticle = isConnected && !isCurator && !hasUpvotedArticle;

  // --- Helper: Switch network if needed ---
  const callContract = (writeFn, config, toastId) => {
    if (chainId !== monadTestnet.id) {
      toast.loading("Switching to Monad Testnet...", { id: toastId });
      switchChain({ chainId: monadTestnet.id }, {
        onSuccess: () => {
          toast.loading('Please confirm in wallet...', { id: toastId });
          writeFn(config);
        },
        onError: (err) => {
          toast.error("Network switch failed", { id: toastId });
          console.error(err);
        }
      });
    } else {
      writeFn(config);
    }
  };

  // --- Handler: Upvote Article ---
  const handleUpvoteArticle = async () => {
    if (!canUpvoteArticle) {
      if (!isConnected) toast.error("Please connect wallet");
      else if (isCurator) toast.error("Cannot upvote your own article");
      else if (hasUpvotedArticle) toast.error("Already upvoted");
      return;
    }
    
    const toastId = toast.loading('Processing upvote...');
    
    callContract(writeVote, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'upvoteArticle',
      args: [article.articleId],
    }, toastId);
  };

  // --- Handler: Post Comment ---
  const handleComment = async (e) => {
    e.preventDefault();
    
    if (!commentText.trim()) {
      toast.error("Please enter a comment");
      return;
    }
    
    if (!isConnected) {
      toast.error("Please connect wallet to comment");
      return;
    }
    
    const toastId = toast.loading('Preparing comment...');
    
    try {
      // Step 1: Save to DB and upload to IPFS
      const { commentMongoId, onChainArticleId, ipfsHash } = await prepareCommentForChain({
        articleId: article.id, // MongoDB ID
        articleUrl: article.articleUrl,
        content: commentText.trim(),
        author: address,
        authorName: userDisplayName || `${address.substring(0, 6)}...${address.substring(38)}`
      });

      // Store for later use after transaction confirms
      setPendingCommentData({ commentMongoId, ipfsHash });
      
      // Step 2: Submit to blockchain
      toast.loading('Please confirm in wallet...', { id: toastId });
      callContract(writeComment, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'postComment',
        args: [onChainArticleId, ipfsHash],
      }, toastId);

    } catch (err) {
      toast.error(err.message || 'Failed to prepare comment', { id: toastId });
      console.error(err);
    }
  };

  // --- Handler: Post Reply ---
  const handleReply = async (parentComment) => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply");
      return;
    }
    
    if (!isConnected) {
      toast.error("Please connect wallet to reply");
      return;
    }
    
    const toastId = toast.loading('Preparing reply...');
    
    try {
      // Step 1: Save to DB and upload to IPFS
      const { commentMongoId, onChainArticleId, ipfsHash } = await prepareCommentForChain({
        articleId: article.id,
        articleUrl: article.articleUrl,
        content: replyText.trim(),
        author: address,
        authorName: userDisplayName || `${address.substring(0, 6)}...${address.substring(38)}`,
        parentId: parentComment.id // MongoDB parent ID
      });

      setPendingCommentData({ commentMongoId, ipfsHash });
      
      // Step 2: Submit to blockchain
      toast.loading('Please confirm in wallet...', { id: toastId });
      callContract(writeComment, {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'postComment',
        args: [onChainArticleId, ipfsHash],
      }, toastId);

    } catch (err) {
      toast.error(err.message || 'Failed to prepare reply', { id: toastId });
      console.error(err);
    }
  };

  // --- Handler: Upvote Comment ---
  const handleUpvoteComment = async (comment) => {
    if (!isConnected) {
      toast.error("Please connect wallet");
      return;
    }
    
    // Check if user already upvoted (from DB data)
    if (comment.upvotedBy?.some(vote => 
      typeof vote === 'string' ? vote === address : vote.address?.toLowerCase() === address?.toLowerCase()
    )) {
      toast.error("Already upvoted this comment");
      return;
    }
    
    // Check if user is the commenter
    if (comment.author?.toLowerCase() === address?.toLowerCase()) {
      toast.error("Cannot upvote your own comment");
      return;
    }
    
    if (!comment.commentId) {
      toast.error("Comment not yet on-chain");
      return;
    }
    
    const toastId = toast.loading('Upvoting comment...');
    
    callContract(writeVote, {
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'upvoteComment',
      args: [comment.commentId],
    }, toastId);
  };
  
  // --- Effect: Handle Vote Confirmation ---
  useEffect(() => {
    if (isVoteConfirming) {
      toast.loading('Confirming vote on blockchain...', { id: "voteToast" });
    }
    
    if (isVoteConfirmed && voteReceipt) {
      toast.success('Vote confirmed!', { id: "voteToast" });
      
      try {
        // Parse transaction logs
        for (const log of voteReceipt.logs) {
          try {
            const event = decodeEventLog({ 
              abi: CONTRACT_ABI, 
              data: log.data, 
              topics: log.topics 
            });
            
            if (event.eventName === 'ArticleUpvoted') {
              const newUpvoteCount = Number(event.args.newUpvoteCount);
              syncArticleUpvotesDB(article.articleUrl, newUpvoteCount);
            }
            
            if (event.eventName === 'CommentUpvoted') {
              const commentId = Number(event.args.commentId);
              const newUpvoteCount = Number(event.args.newUpvoteCount);
              syncCommentUpvotesDB(commentId, newUpvoteCount);
            }
            
            if (event.eventName === 'PointsAwarded') {
              const awardedUser = event.args.user.toLowerCase();
              const totalPoints = Number(event.args.totalPoints);
              
              // Update points if it's for the current user
              if (awardedUser === address?.toLowerCase()) {
                setUserPoints(totalPoints);
              }
            }
          } catch (decodeError) {
            // Skip logs that aren't from our contract
            console.log("Skipping log:", decodeError);
          }
        }
      } catch (err) {
        console.error("Error parsing vote logs:", err);
      }
      
      // Refetch article and upvote status
      loadArticle(id);
      refetchHasUpvotedArticle();
    }
  }, [isVoteConfirming, isVoteConfirmed, voteReceipt, address, id]);
  
  // --- Effect: Handle Comment Confirmation ---
  useEffect(() => {
    if (isCommentConfirming) {
      toast.loading('Confirming comment on blockchain...', { id: "commentToast" });
    }
    
    if (isCommentConfirmed && commentReceipt) {
      toast.success('Comment posted on-chain!', { id: "commentToast" });
      
      let onChainCommentId = null;
      
      try {
        // Extract comment ID from event logs
        for (const log of commentReceipt.logs) {
          try {
            const event = decodeEventLog({ 
              abi: CONTRACT_ABI, 
              data: log.data, 
              topics: log.topics 
            });
            
            if (event.eventName === 'CommentPosted') {
              onChainCommentId = Number(event.args.commentId);
              break;
            }
          } catch (decodeError) {
            console.log("Skipping log:", decodeError);
          }
        }
      } catch (err) {
        console.error("Error parsing comment logs:", err);
      }
      
      // Update DB with on-chain comment ID
      if (onChainCommentId && pendingCommentData?.commentMongoId) {
        markCommentOnChainDB(
          pendingCommentData.commentMongoId, 
          onChainCommentId, 
          pendingCommentData.ipfsHash
        );
      }
      
      // Clear form and state
      setCommentText("");
      setReplyText("");
      setReplyingTo(null);
      setPendingCommentData(null);
      
      // Reload article to show new comment
      loadArticle(id);
    }
  }, [isCommentConfirming, isCommentConfirmed, commentReceipt, pendingCommentData, id]);

  // --- Effect: Handle Errors ---
  useEffect(() => {
    if (voteError) {
      toast.error(voteError.message || "Voting failed");
      console.error("Vote error:", voteError);
    }
  }, [voteError]);

  useEffect(() => {
    if (commentError) {
      toast.error(commentError.message || "Comment failed");
      console.error("Comment error:", commentError);
    }
  }, [commentError]);

  // --- Render Helper: Comment Component ---
  const renderComment = (comment, isReply = false) => {
    const hasUpvoted = comment.upvotedBy?.some(vote => 
      typeof vote === 'string' 
        ? vote === address 
        : vote.address?.toLowerCase() === address?.toLowerCase()
    );
    
    const isCommenter = comment.author?.toLowerCase() === address?.toLowerCase();
    const canUpvote = isConnected && !isCommenter && !hasUpvoted && comment.onChain;
    
    return (
      <div 
        key={comment.id} 
        className={`${isReply ? 'ml-12 mt-3' : 'mb-4'} bg-gray-50 border border-gray-200 rounded-lg p-4`}
      >
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className="font-medium text-gray-700">
              {comment.authorName || 'Anonymous'}
            </span>
            {comment.author && (
              <span className="ml-2 text-xs text-gray-500">
                ({comment.author.substring(0, 6)}...{comment.author.substring(38)})
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleUpvoteComment(comment)}
              disabled={!canUpvote}
              className={`flex items-center gap-1 text-sm ${
                !canUpvote 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:text-blue-800'
              }`}
              title={
                !isConnected ? "Connect wallet to upvote" :
                isCommenter ? "Cannot upvote own comment" :
                hasUpvoted ? "Already upvoted" :
                !comment.onChain ? "Comment not yet on-chain" :
                "Upvote this comment"
              }
            >
              👍 {comment.upvotes}
            </button>
            {comment.onChain && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                ⛓️ On-chain
              </span>
            )}
            {!comment.onChain && (
              <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                ⏳ Pending
              </span>
            )}
          </div>
        </div>
        
        <p className="text-gray-700 mb-2">{comment.content}</p>
        
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>{new Date(comment.createdAt).toLocaleString()}</span>
          {!isReply && isConnected && (
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
              disabled={isCommenting || isCommentConfirming}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => handleReply(comment)}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 text-sm disabled:bg-gray-400"
                disabled={isCommenting || isCommentConfirming || !replyText.trim()}
              >
                {isCommenting || isCommentConfirming ? '⏳ Posting...' : 'Post Reply'}
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

  // --- Loading State ---
  if (loading || !article) {
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

  // --- Error State ---
  if (error) {
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

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
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
              
              {/* Curator Info */}
              {article.curator && (
                <div className="mb-4 text-sm text-gray-600">
                  Curated by: <span className="font-medium">{article.curatorName || `${article.curator.substring(0, 6)}...${article.curator.substring(38)}`}</span>
                </div>
              )}
              
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
                    <p><strong>Curator:</strong> {article.curatorName || article.curator}</p>
                    <p><strong>IPFS Hash:</strong> <code className="bg-green-100 px-2 py-1 rounded">{article.ipfsHash}</code></p>
                    <p><strong>On-chain ID:</strong> #{article.articleId}</p>
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
                      canUpvoteArticle && !isVoting && !isVoteConfirming
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    onClick={handleUpvoteArticle}
                    disabled={!canUpvoteArticle || isVoting || isVoteConfirming}
                  >
                    {isVoting || isVoteConfirming ? '⏳ Voting...' : 
                     canUpvoteArticle ? '👍 Upvote' : 
                     !isConnected ? 'Connect Wallet' :
                     isCurator ? 'Your Article' :
                     hasUpvotedArticle ? '✓ Upvoted' : 'Cannot Upvote'}
                  </button>
                </div>
              </div>
              
              {/* Comments Section */}
              <div className="border-t-2 border-gray-200 pt-8">
                <h2 className="text-2xl font-bold mb-6">
                  💬 Comments ({article.comments?.length || 0})
                </h2>
                
                {/* Comment Form */}
                {isConnected ? (
                  <form onSubmit={handleComment} className="mb-8">
                    <textarea
                      className="w-full border-2 border-gray-300 p-4 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                      rows={4}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Share your thoughts..."
                      disabled={isCommenting || isCommentConfirming}
                    />
                    <button 
                      type="submit"
                      className="mt-3 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                      disabled={isCommenting || isCommentConfirming || !commentText.trim()}
                    >
                      {isCommenting || isCommentConfirming ? '⏳ Posting...' : '✉️ Post Comment'}
                    </button>
                  </form>
                ) : (
                  <div className="mb-8 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">
                      🔒 Please connect your wallet to post comments
                    </p>
                  </div>
                )}
                
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