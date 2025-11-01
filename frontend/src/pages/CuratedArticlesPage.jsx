import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Leaderboard from "../components/Leaderboard";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Newspaper, BookOpen, ThumbsUp, MessageSquare, Target, Gem, Link2, Rocket, Inbox, X } from "lucide-react";

const API_BASE = 'http://localhost:5000/api';

export default function CuratedArticlesPage() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE}/articles/all`);
      setArticles(response.data || []);
    } catch (err) {
      console.error('Articles fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (article) => {
    // Use _id if id is not available
    const articleId = article.id || article._id;
    if (articleId) {
      navigate(`/curated/${articleId}`);
    } else {
      console.error('No valid article ID found:', article);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="container mx-auto px-4 py-32 text-center">
          <div className="relative inline-block mb-6">
            <div className="animate-spin rounded-full h-20 w-20 border-2 border-purple-900 border-t-purple-500"></div>
            <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-pulse"></div>
          </div>
          <p className="text-purple-400 text-lg font-bold uppercase tracking-wide">Loading Articles...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-wide">
                Collections
              </h1>
              <p className="text-purple-400 text-sm font-bold uppercase mt-1">
                High-Quality Web3 Content from the Community
              </p>
            </div>
          </div>
          <p className="text-purple-300 text-sm leading-relaxed max-w-3xl">
            Explore documents handpicked by our community curators. Every document is verified, summarized, and enriched with AI-powered insights. Vote on your favorites, engage in discussions, and earn rewards for quality contributions. The best content rises to the top through community consensus.
          </p>
        </div>

        {/* Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-4 text-center hover:border-purple-600 transition-all duration-300">
            <div className="text-3xl font-black text-white mb-1">{articles.length}</div>
            <div className="text-xs text-white font-bold uppercase">Total Collections</div>
          </div>
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-4 text-center hover:border-purple-600 transition-all duration-300">
            <div className="text-3xl font-black text-white mb-1">
              {articles.reduce((sum, a) => sum + (a.upvotes || 0), 0)}
            </div>
            <div className="text-xs text-white font-bold uppercase">Total Upvotes</div>
          </div>
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-4 text-center hover:border-purple-600 transition-all duration-300">
            <div className="text-3xl font-black text-white mb-1">
              {articles.reduce((sum, a) => sum + (a.comments?.length || 0), 0)}
            </div>
            <div className="text-xs text-white font-bold uppercase">Total Comments</div>
          </div>
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-4 text-center hover:border-purple-600 transition-all duration-300">
            <div className="text-3xl font-black text-white mb-1">
              {new Set(articles.map(a => a.curator)).size}
            </div>
            <div className="text-xs text-white font-bold uppercase">Active Curators</div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <Leaderboard />

        {/* All Articles Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-6 pb-6 border-b-2 border-purple-600 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide">Browse All Collections</h2>
                <p className="text-purple-400 text-xs font-bold uppercase mt-1">
                  {articles.length} Collection{articles.length !== 1 ? 's' : ''} Available
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/curate')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-lg font-bold text-xs uppercase border-2 border-purple-500 transition-all duration-300 transform hover:scale-105"
            >
              + Curate 
            </button>
          </div>

          {error ? (
            <div className="bg-red-900 border-2 border-red-600 rounded-lg p-8 text-center">
              <X className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 text-lg font-black uppercase">{error}</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="bg-purple-900 border-2 border-purple-700 rounded-lg p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
                <Inbox className="w-10 h-10 text-white" />
              </div>
              <p className="text-purple-400 text-xl font-black uppercase mb-2">No Collections Yet</p>
              <p className="text-purple-500 text-sm font-bold mb-6">Be the first to curate quality content!</p>
              <button 
                onClick={() => navigate('/curate')}
                className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-bold text-sm uppercase border-2 border-purple-500 transition-all duration-300 transform hover:scale-105"
              >
                Start Curating
              </button>
            </div>
          ) : (
            <>
              <p className="text-purple-300 text-sm mb-6 leading-relaxed">
                Each document has been carefully curated and processed with AI to provide you with comprehensive summaries, key takeaways, and important statistics. Click on any document to read the full analysis, engage with the community through comments, and show your appreciation with upvotes.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {articles.map((article) => (
                  <div
                    key={article.id || article._id}
                    onClick={() => handleArticleClick(article)}
                    className="bg-purple-900 border-2 border-purple-700 rounded-lg overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:border-purple-600 hover:shadow-2xl group"
                  >
                    {/* Image */}
                    {article.imageUrl && (
                      <div className="border-b-2 border-purple-700 h-48 overflow-hidden relative">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="font-black text-white group-hover:text-purple-400 text-base mb-3 line-clamp-2 uppercase tracking-wide transition-colors leading-tight">
                        {article.title}
                      </h3>
                      
                      <p className="text-purple-400 text-xs mb-4 line-clamp-1 font-bold leading-relaxed">
                        {article.summary}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-2 mb-4">
                        <div className="bg-purple-950 border-2 border-purple-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 flex-1 group-hover:border-purple-700 transition-colors">
                          <ThumbsUp className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-black text-sm">{article.upvotes || 0}</span>
                        </div>
                        <div className="bg-purple-950 border-2 border-purple-800 rounded-lg px-3 py-1.5 flex items-center gap-1.5 flex-1 group-hover:border-purple-700 transition-colors">
                          <MessageSquare className="w-4 h-4 text-purple-400" />
                          <span className="text-white font-black text-sm">{article.comments?.length || 0}</span>
                        </div>
                      </div>

                      {/* Curator */}
                      {article.curator && (
                        <div className="border-t-2 border-purple-700 pt-3 flex items-center gap-2">
                          <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold border-2 border-purple-500 flex-shrink-0">
                            {(article.curatorName || 'C')[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-purple-500 text-xs font-black uppercase leading-tight">Curator</p>
                            <p className="text-white text-xs font-bold truncate">
                              {article.curatorName || `${article.curator.substring(0, 8)}...`}
                            </p>
                          </div>
                          {/* Status Badge */}
                          {article.onChain && (
                            <div className="bg-purple-600 border-2 border-purple-500 rounded-lg px-2 py-1 flex-shrink-0">
                              <Link2 className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="border-t-2 border-purple-600 mb-10"></div>

        {/* Info Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500 mb-4">
              <Target className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-white uppercase mb-2">Quality First</h3>
            <p className="text-purple-300 text-xs leading-relaxed">
              Every article is carefully vetted by community curators and processed with AI to extract key insights, summaries, and important data points.
            </p>
          </div>
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500 mb-4">
              <Gem className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-white uppercase mb-2">Earn Rewards</h3>
            <p className="text-purple-300 text-xs leading-relaxed">
              Curators and active participants earn points for quality contributions. Upvote great content, post insightful comments, and help build the community.
            </p>
          </div>
          <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 hover:border-purple-600 transition-all duration-300">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500 mb-4">
              <Link2 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-black text-white uppercase mb-2">On-Chain Verified</h3>
            <p className="text-purple-300 text-xs leading-relaxed">
              All articles, comments, and votes are recorded on the blockchain, ensuring transparency, immutability, and true ownership of your contributions.
            </p>
          </div>
        </div>
        
        {/* Separator */}
        <div className="border-t-2 border-purple-600 mb-10"></div>

        {/* CTA Section */}
        <div className="text-center bg-black border-2 border-purple-600 rounded-lg p-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-black text-white uppercase mb-3 tracking-wide">
              Ready to Share Your Insights?
            </h2>
            <p className="text-purple-300 text-sm mb-6 leading-relaxed">
              Found an interesting article? Share it with the community! Our AI will help you create comprehensive summaries and extract key insights. Start curating today and earn rewards for quality contributions.
            </p>
            <button 
              onClick={() => navigate('/curate')}
              className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-3 rounded-lg font-black uppercase text-sm border-2 border-purple-500 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
            >
              <Rocket className="w-5 h-5" />
              Start Curating Now
            </button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}