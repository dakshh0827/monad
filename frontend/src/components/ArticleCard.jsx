import React from "react";

export default function ArticleCard({ article }) {
  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-purple-400/60 transition-all duration-300 group">
      <div className="relative h-56 overflow-hidden">
        <img 
          src={article.urlToImage || "/fallback.jpg"} 
          alt={article.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      </div>
      
      <div className="p-6">
        <h2 className="font-bold text-xl mb-3 text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
          {article.title}
        </h2>
        <p className="text-sm text-gray-400 mb-4 line-clamp-3 leading-relaxed">
          {article.description}
        </p>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors group"
        >
          <span>Read Original Article</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
      </div>
    </div>
  );
}