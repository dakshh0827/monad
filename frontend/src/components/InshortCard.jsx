// InshortCard.jsx
import React from "react";

export default function InshortCard({ article, onClick }) {
  return (
    <div
      className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-2xl overflow-hidden cursor-pointer group hover:border-purple-400/60 transition-all duration-300 backdrop-blur-sm transform hover:scale-105"
      onClick={onClick}
    >
      <div className="relative h-56 overflow-hidden">
        <img 
          src={article.imageUrl || "/fallback.jpg"} 
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
          {article.summary}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm px-3 py-1.5 bg-purple-900/30 rounded-lg">
            <span>👍</span>
            <span className="text-purple-300 font-medium">{article.upvotes}</span>
          </span>
          <button className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors">
            Read More →
          </button>
        </div>
      </div>
    </div>
  );
}