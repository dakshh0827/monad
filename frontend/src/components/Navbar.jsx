import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";

export default function Navbar() {
  const { wallet, connectWallet, disconnectWallet, userPoints } = useArticleStore();

  useEffect(() => {
    // Auto-connect if already connected
    if (window.ethereum && window.ethereum.selectedAddress) {
      connectWallet().catch(console.error);
    }
  }, [connectWallet]);

  const handleWalletAction = async () => {
    if (wallet) {
      disconnectWallet();
    } else {
      try {
        await connectWallet();
      } catch (error) {
        alert('Failed to connect wallet: ' + error.message);
      }
    }
  };

  return (
    <nav className="bg-linear-to-r from-blue-900 to-indigo-900 text-white px-8 py-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-3xl font-bold hover:text-blue-200 transition-colors">
          🚀 MonadFeed
        </Link>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            className="hover:text-blue-200 transition-colors font-medium"
          >
            Home
          </Link>
          <Link 
            to="/curated" 
            className="hover:text-blue-200 transition-colors font-medium"
          >
            Curated Articles
          </Link>
          
          {/* Points Display */}
          {wallet && (
            <div className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-bold">
              ⭐ {userPoints} Points
            </div>
          )}
          
          {/* Wallet Button */}
          <button
            onClick={handleWalletAction}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              wallet 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {wallet 
              ? `${wallet.substring(0, 6)}...${wallet.substring(38)}` 
              : '🔗 Connect Wallet'
            }
          </button>
        </div>
      </div>
    </nav>
  );
}