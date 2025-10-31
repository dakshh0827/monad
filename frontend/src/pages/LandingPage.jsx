import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useArticleStore } from "../stores/articleStore";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS, monadTestnet } from "../wagmiConfig";
import { decodeEventLog } from "viem";
import axios from "axios";

const API_BASE = 'http://localhost:5000/api';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scrapedPreview, setScrapedPreview] = useState(null);
  const [curatingStep, setCuratingStep] = useState('idle');
  const [submittedIpfsHash, setSubmittedIpfsHash] = useState(null); // Store hash during submit
  
  const navigate = useNavigate();
  
  // --- Wagmi Hooks ---
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { markArticleOnChainDB } = useArticleStore();
  
  // Contract write hook for `submitArticle`
  const { data: hash, isPending, writeContract } = useWriteContract();
  
  // Transaction receipt hook
  const { 
    data: receipt, 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({ hash });

  // --- Original Scrape Function (Unchanged) ---
  const handleScrape = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setError(null);
    setScrapedPreview(null);
    setCuratingStep('idle');
    setSubmittedIpfsHash(null);
    
    const loadingToast = toast.loading('Scraping article...');
    
    try {
      const response = await fetch(`${API_BASE}/articles/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Scraping failed');
      }
      
      setScrapedPreview(data.preview);
      setCuratingStep('scraped');
      toast.success('Article scraped successfully!', { id: loadingToast });
    } catch (err) {
      setError(err.message);
      setScrapedPreview(null);
      toast.error(err.message || 'Failed to scrape article', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  // --- NEW: Curation Submission Function ---
  const handleCurationSubmit = async () => {
    if (!scrapedPreview) return;
    if (!isConnected) {
      toast.error("Please connect your wallet to curate");
      return;
    }
    
    setLoading(true);
    setCuratingStep('preparing');
    const loadingToast = toast.loading('Uploading article to IPFS...');
    
    try {
        // Step 1: Upload Article JSON to IPFS
        const ipfsResponse = await axios.post(`${API_BASE}/articles/upload-ipfs`, scrapedPreview);
        const { ipfsHash } = ipfsResponse.data;

        if (!ipfsHash) throw new Error("Failed to get IPFS hash from backend");

        // --- NEW: STEP 1.5 - Save to DB (Pending State) ---
        // Use the existing /prepare route to create the DB record
        await axios.post(`${API_BASE}/articles/prepare`, {
            ...scrapedPreview, // Pass all data
            ipfsHash // Include the hash you just got
          });
        // --------------------------------------------------

        setSubmittedIpfsHash(ipfsHash); // Save hash to state

        toast.loading('Please confirm in your wallet...', { id: loadingToast });
        setCuratingStep('signing');

      // Step 2: Check network and call contract
      const submitToContract = () => {
        writeContract({
          address: CONTRACT_ADDRESS,
          abi: CONTRACT_ABI,
          functionName: 'submitArticle',
          args: [ipfsHash],
        });
      };
      
      if (chainId !== monadTestnet.id) {
        toast.loading("Switch to Monad Testnet...", { id: loadingToast });
        switchChain({ chainId: monadTestnet.id }, {
          onSuccess: () => {
            toast.loading('Please confirm in your wallet...', { id: loadingToast });
            submitToContract();
          },
          onError: (err) => {
            toast.error("Network switch failed", { id: loadingToast });
            setLoading(false);
          }
        });
      } else {
        submitToContract();
      }
    } catch (err) {
      setError(err.message);
      setCuratingStep('scraped');
      toast.error(err.message || 'Failed to submit', { id: loadingToast });
      setLoading(false);
    }
  };

  // --- Effect to handle the transaction receipt ---
  useEffect(() => {
    if (isConfirming) {
      setCuratingStep('confirming');
      toast.loading('Confirming transaction on-chain...', { id: "loadingToast" });
    }
    
    if (isConfirmed && receipt) {
      setCuratingStep('done');
      toast.success('Article curated successfully!', { id: "loadingToast" });
      
      let articleId = null;
      try {
        for (const log of receipt.logs) {
          // Find the correct event log
          const event = decodeEventLog({
            abi: CONTRACT_ABI,
            data: log.data,
            topics: log.topics
          });
          if (event.eventName === 'ArticleSubmitted') {
            articleId = event.args.articleId.toString();
            break;
          }
        }
      } catch (err) {
        console.error("Failed to parse logs:", err);
      }

      if (articleId && submittedIpfsHash && address) {
        // Step 3: Save to our backend DB
        markArticleOnChainDB(
          scrapedPreview.articleUrl, 
          articleId, 
          address, // curator
          submittedIpfsHash
        ).catch(err => {
          toast.error("Failed to sync with DB. Please refresh.");
        });
      } else {
        toast.error("Failed to get ArticleID from transaction");
      }
      
      // Navigate away
      setTimeout(() => {
        navigate('/curated');
      }, 1500);
    }
    
    // Handle user rejection
    if (isPending === false && isConfirming === false && loading) {
       if (curatingStep === 'signing') {
          setLoading(false);
          setCuratingStep('scraped');
          toast.error("Transaction rejected", { id: "loadingToast" });
       }
    }

  }, [isConfirming, isConfirmed, isPending, receipt]);

  const handleReset = () => {
    setUrl('');
    setScrapedPreview(null);
    setError(null);
    setCuratingStep('idle');
    setSubmittedIpfsHash(null);
    toast.success('Form cleared');
  };

  // --- Button Text Logic ---
  const getButtonText = () => {
    if (curatingStep === 'preparing') return '⏳ Uploading...';
    if (curatingStep === 'signing') return '✍️ Signing...';
    if (isPending || curatingStep === 'confirming') return '⛓️ Confirming...';
    if (curatingStep === 'done') return '✅ Curated!';
    return '💾 Curate & Sign';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 text-gray-900">
              MonadFeed 🚀
            </h1>
            <p className="text-gray-700 text-xl mb-2">
              Decentralized Web3 News Curation Platform
            </p>
            <p className="text-gray-600 text-lg">
              Curate articles • Earn rewards • Build reputation
            </p>
          </div>
          
          {/* Info Banner */}
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6 text-center">
            <p className="text-blue-800 font-medium mb-2">
              ⚡ Fast AI-powered summarization with OpenAI GPT-4
            </p>
            <p className="text-blue-600 text-sm">
              No wallet needed for testing • Blockchain integration coming soon
            </p>
          </div>
          
          {/* URL Input */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-bold mb-4">Step 1: Enter Article URL</h2>
            <form onSubmit={handleScrape}>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article..."
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  required
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {loading && curatingStep === 'idle' ? '⏳ Scraping...' : '🔍 Scrape'}
                </button>
              </div>
            </form>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-lg mb-6">
              <p className="font-medium">❌ Error: {error}</p>
            </div>
          )}
          
          {/* Scraped Article Preview */}
          {scrapedPreview && (
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Step 2: Preview & Save</h2>
                <button 
                  onClick={handleReset}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕ Clear
                </button>
              </div>
              
              <div className="border-2 border-gray-200 rounded-lg p-4 mb-6">
                {scrapedPreview.imageUrl && (
                  <img 
                    src={scrapedPreview.imageUrl} 
                    alt={scrapedPreview.title}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                )}
                
                <h3 className="text-2xl font-bold mb-3 text-gray-900">
                  {scrapedPreview.title}
                </h3>
                
                {/* Short Summary */}
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <h4 className="font-bold text-blue-900 mb-2">Quick Summary:</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {scrapedPreview.summary}
                  </p>
                </div>
                
                {/* Detailed Summary Preview */}
                {scrapedPreview.detailedSummary && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-bold text-gray-900 mb-2">Detailed Analysis:</h4>
                    <p className="text-gray-700 leading-relaxed line-clamp-6">
                      {scrapedPreview.detailedSummary}
                    </p>
                  </div>
                )}
                
                {/* Key Points */}
                {scrapedPreview.keyPoints && scrapedPreview.keyPoints.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-bold text-gray-900 mb-2">Key Points:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {scrapedPreview.keyPoints.slice(0, 3).map((point, idx) => (
                        <li key={idx} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Metadata */}
                <div className="flex gap-4 text-sm text-gray-600 mb-4">
                  {scrapedPreview.author && (
                    <span>👤 {scrapedPreview.author}</span>
                  )}
                  {scrapedPreview.publisher && (
                    <span>📰 {scrapedPreview.publisher}</span>
                  )}
                  {scrapedPreview.date && (
                    <span>📅 {new Date(scrapedPreview.date).toLocaleDateString()}</span>
                  )}
                </div>
                
                <a
                  href={scrapedPreview.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  🔗 {scrapedPreview.articleUrl}
                </a>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                <a
                  href={scrapedPreview.articleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium"
                >
                  📖 Read Original
                </a>
                
                {/* THIS IS THE MODIFIED BUTTON */}
                <button
                  onClick={handleCurationSubmit}
                  disabled={loading || isPending || isConfirming || !isConnected}
                  className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {!isConnected ? 'Please Connect Wallet' : getButtonText()}
                </button>
              </div>
            </div>
          )}
          
          {/* How it Works */}
          {!scrapedPreview && !loading && (
            <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
              <h3 className="text-xl font-bold mb-4">How It Works</h3>
              <div className="space-y-3 text-gray-700">
                <div className="flex gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <p><strong>Scrape:</strong> Paste article URL - AI extracts content and metadata</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <p><strong>Analyze:</strong> OpenAI generates both quick summary and detailed analysis</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <p><strong>Review:</strong> Preview key points, statistics, and full content extraction</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-2xl">4️⃣</span>
                  <p><strong>Curate:</strong> Save to database - blockchain integration coming soon!</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}