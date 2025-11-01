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
import { Rocket, Search, CheckCircle, X, Target, Gem, Link2, BookOpen, Sparkles, Zap, Link as LinkIcon, Check, Clock, FileText, Newspaper, Key, User, Calendar, Globe, ExternalLink, HourglassIcon, Loader, CheckCircle2, Save } from "lucide-react";

const API_BASE = 'http://localhost:5000/api';

export default function LandingPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scrapedPreview, setScrapedPreview] = useState(null);
  const [curatingStep, setCuratingStep] = useState('idle');
  const [submittedIpfsHash, setSubmittedIpfsHash] = useState(null);
  
  const navigate = useNavigate();
  
  const { isConnected, address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const { markArticleOnChainDB } = useArticleStore();
  
  const { data: hash, isPending, writeContract } = useWriteContract();
  const { data: receipt, isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

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
      const ipfsResponse = await axios.post(`${API_BASE}/articles/upload-ipfs`, scrapedPreview);
      const { ipfsHash } = ipfsResponse.data;

      if (!ipfsHash) throw new Error("Failed to get IPFS hash from backend");

      await axios.post(`${API_BASE}/articles/prepare`, {
        ...scrapedPreview,
        ipfsHash
      });

      setSubmittedIpfsHash(ipfsHash);
      toast.loading('Please confirm in your wallet...', { id: loadingToast });
      setCuratingStep('signing');

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
        markArticleOnChainDB(
          scrapedPreview.articleUrl, 
          articleId, 
          address,
          submittedIpfsHash
        ).catch(err => {
          toast.error("Failed to sync with DB. Please refresh.");
        });
      } else {
        toast.error("Failed to get ArticleID from transaction");
      }
      
      setTimeout(() => {
        navigate('/curated');
      }, 1500);
    }
    
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

  const getButtonText = () => {
    if (curatingStep === 'preparing') return <><Clock className="w-4 h-4 inline" /> Uploading...</>;
    if (curatingStep === 'signing') return <><FileText className="w-4 h-4 inline" /> Signing...</>;
    if (isPending || curatingStep === 'confirming') return <><Link2 className="w-4 h-4 inline" /> Confirming...</>;
    if (curatingStep === 'done') return <><CheckCircle2 className="w-4 h-4 inline" /> Curated!</>;
    return <><Save className="w-4 h-4 inline" /> Curate & Sign</>;
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <h1 className="text-5xl md:text-5xl font-black mb-6 text-white uppercase tracking-wide leading-tight">
              Decentralized Curation
            </h1>
            <p className="text-purple-400 text-xl mb-4 leading-relaxed font-bold">
              Curate articles and posts • Earn rewards • Build reputation on-chain
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <div className="bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
                <span className="text-white font-bold"><Zap className="w-4 h-4 inline mr-1" /> AI-Powered Summarization</span>
              </div>
              <div className="bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
                <span className="text-white font-bold"><LinkIcon className="w-4 h-4 inline mr-1" /> IPFS Storage</span>
              </div>
              <div className="bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
                <span className="text-white font-bold"><Link2 className="w-4 h-4 inline mr-1" /> On-Chain Verification</span>
              </div>
            </div>
          </div>
          
          {/* URL Input */}
          <div className="mb-10 border-t-2 border-purple-600 pt-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
                <Search className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wide">Enter Article URL</h2>
            </div>
            <form onSubmit={handleScrape}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article..."
                  className="flex-1 px-6 py-4 bg-purple-950 border-2 border-purple-800 rounded-lg text-white placeholder-purple-500 focus:outline-none focus:border-purple-600 transition-colors font-bold"
                  required
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-lg font-bold uppercase border-2 border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 whitespace-nowrap"
                >
                  {loading && curatingStep === 'idle' ? <><Clock className="w-4 h-4 inline mr-1" /> Scraping...</> : <><Search className="w-4 h-4 inline mr-1" /> Scrape Article</>}
                </button>
              </div>
            </form>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border-2 border-red-600 rounded-lg px-6 py-4 mb-8 text-center">
              <p className="font-black text-red-300 flex items-center justify-center gap-2 uppercase">
                <X className="w-5 h-5" /> {error}
              </p>
            </div>
          )}
          
          {/* Scraped Article Preview */}
          {scrapedPreview && (
            <div className="bg-purple-900 border-2 border-purple-700 rounded-lg overflow-hidden mb-10">
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-wide">Preview & Curate</h2>
                  </div>
                  <button 
                    onClick={handleReset}
                    className="text-purple-400 hover:text-purple-300 transition-colors p-2"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 mb-6">
                  {scrapedPreview.imageUrl && (
                    <div className="border-2 border-purple-700 rounded-lg h-80 overflow-hidden mb-6">
                      <img 
                        src={scrapedPreview.imageUrl} 
                        alt={scrapedPreview.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <h3 className="text-3xl font-black mb-4 text-white leading-tight uppercase tracking-wide">
                    {scrapedPreview.title}
                  </h3>
                  
                  {/* Short Summary */}
                  <div className="bg-purple-900 border-2 border-purple-700 rounded-lg p-6 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-6 h-6 text-white" />
                      <h4 className="font-black text-white text-lg uppercase">Quick Summary</h4>
                    </div>
                    <p className="text-white leading-relaxed text-sm">
                      {scrapedPreview.summary}
                    </p>
                  </div>
                  
                  {/* Detailed Summary Preview */}
                  {scrapedPreview.detailedSummary && (
                    <div className="bg-purple-900 border-2 border-purple-700 rounded-lg p-6 mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Newspaper className="w-6 h-6 text-white" />
                        <h4 className="font-black text-white text-lg uppercase">Detailed Analysis</h4>
                      </div>
                      <p className="text-white leading-relaxed line-clamp-6 text-sm">
                        {scrapedPreview.detailedSummary}
                      </p>
                    </div>
                  )}
                  
                  {/* Key Points */}
                  {scrapedPreview.keyPoints && scrapedPreview.keyPoints.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Key className="w-6 h-6 text-white" />
                        <h4 className="font-black text-white text-lg uppercase">Key Takeaways</h4>
                      </div>
                      <ul className="space-y-2">
                        {scrapedPreview.keyPoints.slice(0, 3).map((point, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-white text-sm">
                            <span className="text-white mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className="flex flex-wrap gap-4 text-sm pb-6 border-b-2 border-purple-700">
                    {scrapedPreview.author && (
                      <span className="flex items-center gap-2 bg-purple-900 border-2 border-purple-700 px-3 py-1.5 rounded-lg">
                        <User className="w-4 h-4" /> <span className="text-white font-bold">{scrapedPreview.author}</span>
                      </span>
                    )}
                    {scrapedPreview.publisher && (
                      <span className="flex items-center gap-2 bg-purple-900 border-2 border-purple-700 px-3 py-1.5 rounded-lg">
                        <Newspaper className="w-4 h-4" /> <span className="text-white font-bold">{scrapedPreview.publisher}</span>
                      </span>
                    )}
                    {scrapedPreview.date && (
                      <span className="flex items-center gap-2 bg-purple-900 border-2 border-purple-700 px-3 py-1.5 rounded-lg">
                        <Calendar className="w-4 h-4" /> <span className="text-white font-bold">{new Date(scrapedPreview.date).toLocaleDateString()}</span>
                      </span>
                    )}
                  </div>
                  
                  <a
                    href={scrapedPreview.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:text-purple-300 text-sm flex items-center gap-2 mt-4 transition-colors group font-bold"
                  >
                    <LinkIcon className="w-4 h-4" />
                    <span className="group-hover:underline truncate">{scrapedPreview.articleUrl}</span>
                  </a>
                </div>
                
                {/* Action Buttons */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <a
                    href={scrapedPreview.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-center bg-purple-950 border-2 border-purple-800 text-white py-4 rounded-lg hover:border-purple-600 font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-5 h-5" /> Read Original Article
                  </a>
                  
                  <button
                    onClick={handleCurationSubmit}
                    disabled={loading || isPending || isConfirming || !isConnected}
                    className="bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-lg font-bold uppercase border-2 border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    {!isConnected ? <><LinkIcon className="w-5 h-5" /> Connect Wallet to Curate</> : getButtonText()}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* How it Works */}
          {!scrapedPreview && !loading && (
            <>
              {/* Separator */}
              <div className="border-t-2 border-purple-600 mb-6"></div>

              <div className="mb-10">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
                    <Rocket className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-wide">How It Works</h3>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl flex items-center justify-center w-10 h-10 bg-purple-900 rounded-lg border-2 border-purple-700 font-black text-white">1</span>
                      <h4 className="font-black text-white text-lg uppercase">Scrape</h4>
                    </div>
                    <p className="text-white text-sm">Paste article URL - AI extracts content and metadata automatically</p>
                  </div>
                  
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl flex items-center justify-center w-10 h-10 bg-purple-900 rounded-lg border-2 border-purple-700 font-black text-white">2</span>
                      <h4 className="font-black text-white text-lg uppercase">Analyze</h4>
                    </div>
                    <p className="text-white text-sm">OpenAI generates both quick summary and detailed analysis</p>
                  </div>
                  
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl flex items-center justify-center w-10 h-10 bg-purple-900 rounded-lg border-2 border-purple-700 font-black text-white">3</span>
                      <h4 className="font-black text-white text-lg uppercase">Review</h4>
                    </div>
                    <p className="text-white text-sm">Preview key points, statistics, and full content extraction</p>
                  </div>
                  
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl flex items-center justify-center w-10 h-10 bg-purple-900 rounded-lg border-2 border-purple-700 font-black text-white">4</span>
                      <h4 className="font-black text-white text-lg uppercase">Curate</h4>
                    </div>
                    <p className="text-white text-sm">Upload to IPFS and submit to blockchain for verification</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}