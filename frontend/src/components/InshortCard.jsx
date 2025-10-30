import React from "react";
export default function InshortCard({ article, onClick }) {
  return (
    <div
      className="bg-white rounded shadow-md p-4 flex flex-col cursor-pointer hover:shadow-lg"
      onClick={onClick}
    >
      <img src={article.imageUrl || "/fallback.jpg"} alt="" className="h-48 rounded object-cover mb-2" />
      <h2 className="font-bold">{article.title}</h2>
      <p className="text-sm text-gray-600 mt-2">{article.summary}</p>
      <span className="text-xs text-gray-400">Upvotes: {article.upvotes}</span>
    </div>
  );
}
