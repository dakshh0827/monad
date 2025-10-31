// frontend/src/components/Leaderboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get(`${API_BASE}/leaderboard/top`);
      setLeaderboard(response.data || []);
      
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError(err.response?.data?.error || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (articleId) => {
    navigate(`/curated/${articleId}`);
  };

  // Rank medal/badge
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Top Articles
        </h2>
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Top Articles
        </h2>
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
          <p className="text-red-800 text-center">
            ❌ {error}
          </p>
        </div>
      </div>
    );
  }

  // Empty State
  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          🏆 Top Articles
        </h2>
        <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">No articles in leaderboard yet</p>
          <p className="text-sm text-gray-500">
            Articles need upvotes or comments to appear here
          </p>
        </div>
      </div>
    );
  }

  // Main Render
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2">
          🏆 Top Articles
        </h2>
        <p className="text-sm text-gray-600">
          Ranked by engagement: 60% comments + 40% upvotes
        </p>
      </div>

      {/* Leaderboard List */}
      <div className="space-y-4">
        {leaderboard.map((article) => (
          <div
            key={article.id}
            onClick={() => handleArticleClick(article.id)}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
          >
            {/* Rank and Title Row */}
            <div className="flex items-start gap-3 mb-3">
              {/* Rank Badge */}
              <div className="flex-shrink-0">
                <div className={`text-2xl font-bold ${
                  article.rank === 1 ? 'text-yellow-500' :
                  article.rank === 2 ? 'text-gray-400' :
                  article.rank === 3 ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {getRankBadge(article.rank)}
                </div>
              </div>

              {/* Article Info */}
              <div className="flex-1 min-w-0">
                {/* Title */}
                <h3 className="font-bold text-lg text-gray-900 line-clamp-2 mb-1">
                  {article.title}
                </h3>
                
                {/* Summary */}
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {article.summary}
                </p>

                {/* Stats Row */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    👍 <span className="font-medium">{article.upvotes}</span> upvotes
                  </span>
                  <span className="flex items-center gap-1">
                    💬 <span className="font-medium">{article.commentCount}</span> comments
                  </span>
                  <span className="flex items-center gap-1 text-blue-600 font-semibold">
                    ⭐ <span>{article.score}</span> score
                  </span>
                </div>

                {/* Curator */}
                {article.curator && (
                  <div className="text-xs text-gray-500 mt-2">
                    Curated by: {article.curatorName || `${article.curator.substring(0, 6)}...${article.curator.substring(38)}`}
                  </div>
                )}
              </div>

              {/* Thumbnail */}
              {article.imageUrl && (
                <div className="flex-shrink-0 hidden sm:block">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-4 border-t-2 border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          🔄 Updated in real-time • Only on-chain articles qualify
        </p>
      </div>
    </div>
  );
}