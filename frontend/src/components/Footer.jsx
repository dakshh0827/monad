import React from "react";
import { Link } from "react-router-dom";
import { Rocket, Twitter, MessageCircle, Github } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black border-t-2 border-purple-600 mt-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500 transform group-hover:scale-110 transition-transform duration-300">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-black text-white uppercase tracking-wide">
                ZeroLag
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed">
              Blockchain curation platform. Built on Monad testnet.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Platform</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/curated" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  Curated Articles and Posts
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  Leaderboard
                </a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Resources</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://docs.monad.xyz" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  Documentation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors text-sm font-bold">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">Community</h3>
            <div className="flex gap-3">
              <a 
                href="https://twitter.com/monad_xyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-purple-950 border-2 border-purple-800 rounded-lg flex items-center justify-center hover:border-purple-600 hover:bg-purple-900 transition-all duration-300 group"
              >
                <Twitter className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </a>
              <a 
                href="https://discord.gg/monad" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-purple-950 border-2 border-purple-800 rounded-lg flex items-center justify-center hover:border-purple-600 hover:bg-purple-900 transition-all duration-300 group"
              >
                <MessageCircle className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-purple-950 border-2 border-purple-800 rounded-lg flex items-center justify-center hover:border-purple-600 hover:bg-purple-900 transition-all duration-300 group"
              >
                <Github className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t-2 border-purple-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm font-bold">
              © {new Date().getFullYear()} ZeroLag. Community Powered Web3 News.
            </p>
            <div className="flex items-center gap-2 bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-purple-300 text-sm font-bold uppercase">Built on Monad Testnet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}