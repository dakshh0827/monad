import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useArticleStore } from "../stores/articleStore";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CuratedArticlesPage() {
  const { wallet } = useArticleStore();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'onchain' | 'pending'
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        // Fetch ALL articles (not just on-chain)
        const res = await axios.get('http://localhost:5000/api/articles/all');
        setArticles(res.data);
      } catch (err) {
        setError('Failed to load articles');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchArticles();
  }, []);

  const handleCardClick = (articleId) => {
    navigate(`/curated/${articleId}`);
  };

  // Filter articles based on selection
  const filteredArticles = articles.filter(article => {
    if (filter === 'onchain') return article.onChain;
    if (filter === 'pending') return !article.onChain;
    return true; // 'all'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Curated Articles</h1>
          <p className="text-gray-600 text-lg mb-4">
            Community-curated web3 news
          </p>
          
          {/* Filter Tabs */}
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              All ({articles.length})
            </button>
            <button
              onClick={() => setFilter('onchain')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'onchain' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⛓️ On-Chain ({articles.filter(a => a.onChain).length})
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'pending' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              ⏳ Pending ({articles.filter(a => !a.onChain).length})
            </button>
          </div>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading articles...</p>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-lg">
            <p className="font-medium">❌ {error}</p>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && !error && filteredArticles.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 text-xl mb-4">
              {filter === 'all' && 'No articles yet'}
              {filter === 'onchain' && 'No on-chain articles yet'}
              {filter === 'pending' && 'No pending articles'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Curate First Article
            </button>
          </div>
        )}
        
        {/* Articles Grid */}
        {!loading && !error && filteredArticles.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
                onClick={() => handleCardClick(article.id)}
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-200">
                  <img
                    src={article.imageUrl || '/fallback.jpg'}
                    alt={article.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = '/fallback.jpg';
                    }}
                  />
                  {/* Status Badge */}
                  {article.onChain ? (
                    <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-bold">
                      ⛓️ ON-CHAIN
                    </div>
                  ) : (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded text-xs font-bold">
                      ⏳ PENDING
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="p-4">
                  <h2 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900">
                    {article.title}
                  </h2>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                    {article.summary}
                  </p>
                  
                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      👍 {article.upvotes} upvotes
                    </span>
                    <span className="flex items-center gap-1">
                      💬 {article.comments?.length || 0} comments
                    </span>
                  </div>
                  
                  {/* Curator */}
                  {article.curator && (
                    <div className="text-xs text-gray-500 mb-3">
                      Curated by: {article.curator.substring(0, 6)}...{article.curator.substring(38)}
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <button
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCardClick(article.id);
                    }}
                  >
                    Read More & Interact
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Stats Footer */}
        {!loading && articles.length > 0 && (
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold mb-4">Platform Stats</h3>
            <div className="grid md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-600">{articles.length}</div>
                <div className="text-gray-600">Total Articles</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {articles.filter(a => a.onChain).length}
                </div>
                <div className="text-gray-600">On-Chain</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-600">
                  {articles.reduce((sum, a) => sum + (a.upvotes || 0), 0)}
                </div>
                <div className="text-gray-600">Total Upvotes</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-600">
                  {articles.reduce((sum, a) => sum + (a.comments?.length || 0), 0)}
                </div>
                <div className="text-gray-600">Total Comments</div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}