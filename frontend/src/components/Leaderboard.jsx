import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trophy, ThumbsUp, MessageSquare, Star, Medal, Award, X, BarChart3 } from 'lucide-react';

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
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-4 border-purple-600">
          <div className="w-14 h-14 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Top Articles</h2>
        </div>
        <div className="flex justify-center items-center py-20">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-2 border-purple-900 border-t-purple-500"></div>
            <div className="absolute inset-0 rounded-full bg-purple-500 opacity-20 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-4 border-purple-600">
          <div className="w-14 h-14 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Top Articles</h2>
        </div>
        <div className="bg-red-900 border-2 border-red-600 rounded-lg p-6 text-center">
          <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-400 text-lg font-black uppercase">{error}</p>
        </div>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="mb-10">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-purple-600">
          <div className="w-14 h-14 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider">Top Articles</h2>
        </div>
        <div className="bg-purple-950 border-2 border-purple-800 rounded-lg p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
            <BarChart3 className="w-10 h-10 text-white" />
          </div>
          <p className="text-purple-400 text-lg font-black uppercase">No Articles Yet</p>
        </div>
      </div>
    );
  }

  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  const getMedalIcon = (index) => {
    if (index === 0) return <Award className="w-12 h-12 text-yellow-400" />;
    if (index === 1) return <Award className="w-12 h-12 text-gray-400" />;
    return <Award className="w-12 h-12 text-orange-700" />;
  };

  return (
    <div className="mb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-purple-600">
          <div className="w-14 h-14 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500">
            <Trophy className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider">Top Articles</h2>
            <p className="text-purple-400 text-sm font-bold uppercase mt-1">Leaderboard</p>
          </div>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {topThree.map((article, index) => {
            const colors = [
              'border-purple-600 bg-purple-900/20',
              'border-purple-600 bg-purple-900/20',
              'border-purple-600 bg-purple-900/20'
            ];
            
            return (
              <div
                key={article.id || article._id}
                onClick={() => handleArticleClick(article)}
                className={`bg-black border-2 ${colors[index]} rounded-lg p-6 cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl group`}
              >
                {/* Medal Badge */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <div className="w-24 h-24 bg-purple-600 border-2 border-purple-500 rounded-lg flex items-center justify-center group-hover:opacity-90 transition-colors">
                      {getMedalIcon(index)}
                    </div>
                    {/* <div className="absolute -bottom-3 -right-3 bg-purple-600 border-2 border-purple-500 rounded-lg px-3 py-1 flex items-center gap-1">
                      <Star className="w-4 h-4 text-white" />
                      <span className="text-white font-black text-lg">{article.score}</span>
                    </div> */}
                  </div>
                </div>

                {/* Thumbnail */}
                {article.imageUrl && (
                  <div className="border-2 border-purple-600 rounded-lg h-48 mb-4 overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}

                {/* Article Info */}
                <h3 className="font-black text-white text-xl mb-3 line-clamp-2 uppercase tracking-wide group-hover:text-purple-400 transition-colors">
                  {article.title}
                </h3>
                
                <p className="text-purple-400 text-sm mb-4 line-clamp-1 font-bold">
                  {article.summary}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg px-4 py-2 flex items-center gap-2 flex-1">
                    <ThumbsUp className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-black">{article.upvotes}</span>
                  </div>
                  <div className="bg-purple-950 border-2 border-purple-800 rounded-lg px-4 py-2 flex items-center gap-2 flex-1">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                    <span className="text-white font-black">{article.commentCount}</span>
                  </div>
                </div>

                {/* Curator */}
                {article.curator && (
                  <div className="border-t-2 border-purple-800 pt-3">
                    <p className="text-purple-400 text-xs font-black uppercase tracking-wide">
                      By: {article.curatorName || `${article.curator.substring(0, 8)}...`}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rest of Leaderboard */}
      {rest.length > 0 && (
        <div className="space-y-4">
          <div className="border-t-2 border-purple-600 pt-6 mb-6">
            <h3 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              <span>More Top Articles</span>
            </h3>
          </div>
          {rest.map((article) => (
            <div
              key={article.id || article._id}
              onClick={() => handleArticleClick(article)}
              className="bg-purple-950 border-2 border-purple-800 rounded-lg p-6 cursor-pointer hover:border-purple-600 transition-all duration-300 group"
            >
              <div className="flex items-start gap-6">
                {/* Rank */}
                <div className="bg-purple-600 border-2 border-purple-500 rounded-lg w-16 h-16 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-white font-black text-2xl">#{article.rank}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-black text-white text-lg line-clamp-2 uppercase tracking-wide group-hover:text-purple-400 transition-colors">
                      {article.title}
                    </h3>
                    <div className="bg-purple-600 border-2 border-purple-500 rounded-lg px-3 py-1 flex-shrink-0 flex items-center gap-1">
                      <Star className="w-4 h-4 text-white" />
                      <span className="text-white font-black text-sm">{article.score}</span>
                    </div>
                  </div>

                  <p className="text-purple-400 text-sm mb-4 line-clamp-1 font-bold">
                    {article.summary}
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="bg-black border-2 border-purple-900 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <ThumbsUp className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-black text-sm">{article.upvotes}</span>
                    </div>
                    <div className="bg-black border-2 border-purple-900 rounded-lg px-3 py-1.5 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-400" />
                      <span className="text-white font-black text-sm">{article.commentCount}</span>
                    </div>
                    {article.curator && (
                      <div className="text-purple-400 text-xs font-black uppercase">
                        By: {article.curatorName || `${article.curator.substring(0, 8)}...`}
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnail */}
                {article.imageUrl && (
                  <div className="border-2 border-purple-800 rounded-lg w-24 h-24 overflow-hidden flex-shrink-0 hidden sm:block">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
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
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t-2 border-purple-600 text-center">
        <div className="flex items-center justify-center gap-3">
          {/* <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div> */}
          {/* <p className="text-purple-400 font-black uppercase text-sm tracking-wide">Live Updates Enabled</p> */}
          {/* <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div> */}
        </div>
      </div>
    </div>
  );
}