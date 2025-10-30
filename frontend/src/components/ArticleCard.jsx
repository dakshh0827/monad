import React from "react";
export default function ArticleCard({ article }) {
  return (
    <div className="bg-white rounded shadow-md p-4 flex flex-col">
      <img src={article.urlToImage || "/fallback.jpg"} alt="" className="h-48 rounded object-cover mb-2" />
      <h2 className="font-bold">{article.title}</h2>
      <p className="text-sm text-gray-600 mt-2">{article.description}</p>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 underline mt-2"
      >
        Read Original
      </a>
    </div>
  );
}
