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
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { 
    selectedArticle: article, 
    loadArticle, 
    setUserPoints, 
    prepareCommentForChain, 
    markCommentOnChainDB,
    syncArticleUpvotesDB,
    syncCommentUpvotesDB
  } = useArticleStore();
  
  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCommentData, setPendingCommentData] = useState(null);

  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'CommentPosted',
    enabled: !!article?.articleId, 
    onLogs(logs) {
      for (const log of logs) {
        try {
          const event = decodeEventLog({ 
            abi: CONTRACT_ABI, 
            data: log.data, 
            topics: log.topics 
          });

          if (article?.articleId && event.args.articleId === BigInt(article.articleId)) {
            loadArticle(id); 
            toast.success("New comment detected!");
          }
        } catch (decodeError) {
          console.log("Skipping log:", decodeError);
        }
      }
    },
  });
  
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

  const { data: hasUpvotedArticle, refetch: refetchHasUpvotedArticle } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'hasUserUpvotedArticle',
    args: [address, article?.articleId],
    enabled: isConnected && !!article?.articleId,
  });

  const { data: userDisplayName } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'getDisplayName',
    args: [address],
    enabled: isConnected && !!address,
  });

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

  const isCurator = isConnected && article?.curator?.toLowerCase() === address?.toLowerCase();
  const canUpvoteArticle = isConnected && !isCurator && !hasUpvotedArticle;

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
      const { commentMongoId, onChainArticleId, ipfsHash } = await prepareCommentForChain({
        articleId: article.id,
        articleUrl: article.articleUrl,
        content: commentText.trim(),
        author: address,
        authorName: userDisplayName || (address ? `${address.substring(0, 6)}...${address.substring(38)}` : '')
      });

      setPendingCommentData({ commentMongoId, ipfsHash });
      
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
      const { commentMongoId, onChainArticleId, ipfsHash } = await prepareCommentForChain({
        articleId: article.id,
        articleUrl: article.articleUrl,
        content: replyText.trim(),
        author: address,
        authorName: userDisplayName || (address ? `${address.substring(0, 6)}...${address.substring(38)}` : ''),
        parentId: parentComment.id
      });

      setPendingCommentData({ commentMongoId, ipfsHash });
      
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

  const handleUpvoteComment = async (comment) => {
    if (!isConnected) {
      toast.error("Please connect wallet");
      return;
    }
    
    if (comment.upvotedBy?.some(vote => 
      typeof vote === 'string' ? vote === address : vote.address?.toLowerCase() === address?.toLowerCase()
    )) {
      toast.error("Already upvoted this comment");
      return;
    }
    
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
  
  useEffect(() => {
    if (isVoteConfirming) {
      toast.loading('Confirming vote...', { id: "voteToast" });
    }
    
    if (isVoteConfirmed && voteReceipt) {
      toast.success('Vote confirmed!', { id: "voteToast" });
      
      try {
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
              
              if (awardedUser === address?.toLowerCase()) {
                setUserPoints(totalPoints);
              }
            }
          } catch (decodeError) {
            console.log("Skipping log:", decodeError);
          }
        }
      } catch (err) {
        console.error("Error parsing vote logs:", err);
      }
      
      loadArticle(id);
      refetchHasUpvotedArticle();
    }
  }, [isVoteConfirming, isVoteConfirmed, voteReceipt, address, id]);
  
  useEffect(() => {
    if (isCommentConfirming) {
      toast.loading('Confirming comment...', { id: "commentToast" });
    }
    
    if (isCommentConfirmed && commentReceipt) {
      toast.success('Comment posted!', { id: "commentToast" });
      
      let onChainCommentId = null;
      
      try {
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
      
      if (onChainCommentId && pendingCommentData?.commentMongoId) {
        markCommentOnChainDB(
          pendingCommentData.commentMongoId, 
          onChainCommentId, 
          pendingCommentData.ipfsHash
        );
      }
      
      setCommentText("");
      setReplyText("");
      setReplyingTo(null);
      setPendingCommentData(null);
      
      loadArticle(id);
    }
  }, [isCommentConfirming, isCommentConfirmed, commentReceipt, pendingCommentData, id]);

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
        className={`${isReply ? 'ml-8 md:ml-12 mt-3' : 'mb-4'} bg-purple-950 border-2 border-purple-800 rounded-lg p-4 hover:border-purple-600 transition-all duration-300`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold border-2 border-purple-500">
              {(comment.authorName || 'A')[0].toUpperCase()}
            </div>
            <div>
              <span className="font-bold text-white text-sm block">
                {comment.authorName || 'Anonymous'}
              </span>
              {comment.author && (
                <span className="text-xs text-purple-400 font-mono">
                  {comment.author.substring(0, 6)}...{comment.author.substring(38)}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleUpvoteComment(comment)}
              disabled={!canUpvote}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 border-2 ${
                !canUpvote 
                  ? 'bg-black border-purple-900 text-white cursor-not-allowed' 
                  : 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500 transform hover:scale-105'
              }`}
              title={
                !isConnected ? "Connect wallet to upvote" :
                isCommenter ? "Cannot upvote own comment" :
                hasUpvoted ? "Already upvoted" :
                !comment.onChain ? "Comment not yet on-chain" :
                "Upvote this comment"
              }
            >
              <span className="text-sm">👍</span>
              <span>{comment.upvotes}</span>
            </button>
            
            {comment.onChain ? (
              <span className="bg-purple-600 border-2 border-purple-500 text-white px-2.5 py-1 rounded-lg text-xs font-bold">
                ⛓ ON-CHAIN
              </span>
            ) : (
              <span className="bg-yellow-900 border-2 border-yellow-600 text-yellow-400 px-2.5 py-1 rounded-lg text-xs font-bold">
                ⏳ PENDING
              </span>
            )}
          </div>
        </div>
        
        <p className="text-white mb-3 leading-relaxed text-sm">{comment.content}</p>
        
        <div className="flex items-center gap-4 text-xs text-white font-semibold">
          <span>{new Date(comment.createdAt).toLocaleString()}</span>
          {!isReply && isConnected && (
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-white hover:text-purple-300 font-bold transition-colors uppercase"
            >
              💬 Reply
            </button>
          )}
        </div>
        
        {replyingTo === comment.id && (
          <div className="mt-4 bg-black border-2 border-purple-700 p-4 rounded-lg">
            <textarea
              className="w-full bg-purple-950 border-2 border-purple-700 p-3 rounded-lg text-white text-sm placeholder-purple-500 focus:outline-none focus:border-purple-500 resize-none transition-colors"
              rows={3}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              disabled={isCommenting || isCommentConfirming}
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleReply(comment)}
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-lg text-sm font-bold disabled:opacity-50 border-2 border-purple-500 transition-all duration-300 transform hover:scale-105"
                disabled={isCommenting || isCommentConfirming || !replyText.trim()}
              >
                {isCommenting || isCommentConfirming ? '⏳ POSTING...' : '✉ POST REPLY'}
              </button>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setReplyText("");
                }}
                className="bg-black border-2 border-purple-700 text-white hover:bg-purple-950 px-5 py-2 rounded-lg text-sm font-bold transition-all duration-300"
              >
                CANCEL
              </button>
            </div>
          </div>
        )}
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-4">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  if (loading || !article) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="relative inline-block mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-900 border-t-purple-500"></div>
            <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <p className="text-white text-lg font-bold uppercase">Loading Article...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-16">
          <div className="bg-purple-950 border-2 border-red-600 rounded-lg px-8 py-12 max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-red-900 border-2 border-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">❌</span>
            </div>
            <p className="font-bold text-red-400 text-xl mb-6 uppercase">{error || 'Article not found'}</p>
            <button 
              onClick={() => navigate('/curated')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-bold text-sm border-2 border-purple-500 transition-all duration-300 transform hover:scale-105 uppercase"
            >
              ← Back to Articles
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => navigate('/curated')}
            className="mb-6 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group text-sm font-bold uppercase"
          >
            <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Articles</span>
          </button>
          
          <div className="bg-black border-2 border-purple-600 rounded-lg overflow-hidden">
            {article.imageUrl && (
              <div className="relative h-96 overflow-hidden border-b-2 border-purple-600">
                <img 
                  src={article.imageUrl} 
                  alt={article.title}
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-black opacity-40"></div>
              </div>
            )}
            
            <div className="p-6 md:p-10">
              <h1 className="text-3xl md:text-4xl font-bold mb-6 text-white leading-tight uppercase tracking-wide">
                {article.title}
              </h1>
              
              {article.curator && (
                <div className="flex items-center gap-3 mb-8 bg-purple-950 border-2 border-purple-800 rounded-lg p-4 w-fit">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white text-sm font-bold border-2 border-purple-500">
                    {(article.curatorName || 'C')[0].toUpperCase()}
                  </div>
                  <div>
                    <span className="text-purple-400 font-bold text-xs block uppercase">Curated By</span>
                    <span className="font-bold text-white text-sm">{`article.curatorName || ${article.curator.substring(0, 6)}...${article.curator.substring(38)}`}</span>
                  </div>
                </div>
              )}
              
              <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 mb-8">
                <h3 className="font-bold text-purple-400 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                  <span>📋</span>
                  <span>Quick Summary</span>
                </h3>
                <p className="text-white leading-relaxed text-sm">
                  {article.summary}
                </p>
              </div>
              
              {article.detailedSummary && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-5 text-white flex items-center gap-3 uppercase tracking-wide border-l-4 border-purple-600 pl-4">
                    <span>📰</span>
                    <span>Detailed Analysis</span>
                  </h2>
                  <p className="text-white leading-relaxed whitespace-pre-line text-sm bg-purple-950 border-2 border-purple-800 rounded-lg p-6">
                    {article.detailedSummary}
                  </p>
                </div>
              )}
              
              {article.keyPoints && article.keyPoints.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-5 text-white flex items-center gap-3 uppercase tracking-wide border-l-4 border-purple-600 pl-4">
                    <span>🔑</span>
                    <span>Key Takeaways</span>
                  </h3>
                  <div className="space-y-3">
                    {article.keyPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-3 bg-purple-950 border-2 border-purple-800 rounded-lg p-5 hover:border-purple-600 transition-all duration-300">
                        <span className="bg-purple-600 border-2 border-purple-500 text-white font-bold text-sm w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                        <span className="text-white flex-1 text-sm leading-relaxed">{point}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {article.statistics && article.statistics.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-5 text-white flex items-center gap-3 uppercase tracking-wide border-l-4 border-purple-600 pl-4">
                    <span>📊</span>
                    <span>Key Statistics</span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {article.statistics.map((stat, idx) => (
                      <div key={idx} className="bg-purple-950 border-2 border-purple-800 p-6 rounded-lg hover:border-purple-600 transition-all duration-300 transform hover:scale-105">
                        <div className="text-3xl font-bold text-white mb-2">{stat.value}</div>
                        <div className="text-xs text-white font-bold uppercase">{stat.label}</div>
                        {stat.context && (
                          <div className="text-xs text-purple-400 mt-2">{stat.context}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {article.fullContent && (
                <div className="mb-8">
                  <h3 className="text-xl font-bold mb-5 text-white flex items-center gap-3 uppercase tracking-wide border-l-4 border-purple-600 pl-4">
                    <span>📖</span>
                    <span>Condensed Content</span>
                  </h3>
                  <div className="text-white leading-relaxed whitespace-pre-line text-sm bg-purple-950 border-2 border-purple-800 rounded-lg p-6">
                    {article.fullContent}
                  </div>
                </div>
              )}
              
              {article.onChain && (
                <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 mb-8">
                  <h3 className="font-bold text-purple-400 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                    <span>⛓</span>
                    <span>Blockchain Information</span>
                  </h3>
                  <div className="text-sm text-white space-y-2 font-bold">
                    <p><span className="text-white">ON-CHAIN ID:</span> #{article.articleId}</p>
                  </div>
                </div>
              )}
              
              
              <a
                href={article.articleUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-bold mb-10 transition-all duration-300 border-2 border-purple-500 text-sm uppercase transform hover:scale-105"
              >
                <span>📖</span>
                <span>Read Original Article</span>
              </a>
              
              <div className="border-t-2 border-purple-900 pt-8 mb-10">
                <div className="flex items-center justify-between flex-wrap gap-6 bg-purple-950 border-2 border-purple-800 rounded-lg p-6">
                  <div className="text-center">
                    <span className="text-5xl font-bold text-white block mb-2">
                      {article.upvotes}
                    </span>
                    <span className="text-white text-sm font-bold uppercase tracking-wider">Upvotes</span>
                  </div>
                  
                  <button 
                    className={`px-8 py-3 rounded-lg font-bold transition-all duration-300 text-sm uppercase border-2 ${
                      canUpvoteArticle && !isVoting && !isVoteConfirming
                        ? 'bg-purple-600 border-purple-500 text-white hover:bg-purple-500 transform hover:scale-105' 
                        : 'bg-black border-purple-900 text-white cursor-not-allowed'
                    }`}
                    onClick={handleUpvoteArticle}
                    disabled={!canUpvoteArticle || isVoting || isVoteConfirming}
                  >
                    {isVoting || isVoteConfirming ? '⏳ Voting...' : 
                     canUpvoteArticle ? '👍 Upvote Article' : 
                     !isConnected ? '🔗 Connect Wallet' :
                     isCurator ? '✓ Your Article' :
                     hasUpvotedArticle ? '✓ Already Upvoted' : 'Cannot Upvote'}
                  </button>
                </div>
              </div>
              
              <div className="border-t-2 border-purple-900 pt-10">
                <h2 className="text-2xl font-bold mb-8 text-white flex items-center gap-3 uppercase tracking-wide">
                  <span>💬</span>
                  <span>Comments ({article.comments?.length || 0})</span>
                </h2>
                
                {isConnected ? (
                  <form onSubmit={handleComment} className="mb-10">
                    <textarea
                      className="w-full bg-purple-950 border-2 border-purple-700 p-4 rounded-lg text-white text-sm placeholder-purple-500 focus:outline-none focus:border-purple-500 resize-none transition-colors"
                      rows={4}
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      placeholder="Share your thoughts on this article..."
                      disabled={isCommenting || isCommentConfirming}
                    />
                    <button 
                      type="submit"
                      className="mt-4 bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all duration-300 text-sm uppercase border-2 border-purple-500 transform hover:scale-105"
                      disabled={isCommenting || isCommentConfirming || !commentText.trim()}
                    >
                      {isCommenting || isCommentConfirming ? '⏳ Posting...' : '✉ Post Comment'}
                    </button>
                  </form>
                ) : (
                  <div className="mb-10 bg-yellow-900 border-2 border-yellow-600 rounded-lg p-8 text-center">
                    <div className="w-14 h-14 bg-yellow-800 border-2 border-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">🔒</span>
                    </div>
                    <p className="text-yellow-400 font-bold text-sm uppercase tracking-wide">
                      Connect Your Wallet to Post Comments
                    </p>
                  </div>
                )}
                
                <div className="space-y-4">
                  {article.comments && article.comments.length > 0 ? (
                    article.comments.map(comment => renderComment(comment))
                  ) : (
                    <div className="text-center py-16 bg-purple-950 border-2 border-purple-800 rounded-lg">
                      <div className="w-16 h-16 bg-purple-900 border-2 border-purple-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">💭</span>
                      </div>
                      <p className="text-white text-sm font-bold uppercase">
                        No Comments Yet
                      </p>
                      <p className="text-white text-xs mt-2">
                        Be the first to share your thoughts!
                      </p>
                    </div>
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