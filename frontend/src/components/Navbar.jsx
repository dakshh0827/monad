import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useReadContract, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../wagmiConfig";
import toast from "react-hot-toast";
import axios from "axios";

const API_BASE = 'http://localhost:5000/api';

export default function Navbar() {
  const { userPoints, displayName, setUserPoints, setDisplayName } = useArticleStore();
  const [newName, setNewName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  
  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Web3Modal hook
  const { open } = useWeb3Modal();

  // --- Contract Read Hooks ---
  
  const { data: pointsData, refetch: refetchPoints } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'getUserPoints',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: nameData, refetch: refetchName } = useReadContract({
    abi: CONTRACT_ABI,
    address: CONTRACT_ADDRESS,
    functionName: 'getDisplayName',
    args: [address],
    enabled: isConnected && !!address,
  });

  // --- Contract Write Hook for setDisplayName ---
  
  const { data: hash, isPending, writeContract, error: writeError, isError: isWriteError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: receiptError, 
    isError: isReceiptError 
  } = useWaitForTransactionReceipt({ hash });

  // --- Effects to sync wagmi data with zustand store ---

  useEffect(() => {
    if (isConnected && address) {
      refetchPoints();
      refetchName();
      // Also fetch from database for backup
      fetchUserFromDb(address);
    } else {
      setUserPoints(0);
      setDisplayName('');
      setIsEditingName(false);
    }
  }, [isConnected, address, refetchPoints, refetchName, setUserPoints, setDisplayName]);

  useEffect(() => {
    if (pointsData !== undefined) {
      setUserPoints(Number(pointsData));
    }
  }, [pointsData, setUserPoints]);

  useEffect(() => {
    if (nameData) {
      setDisplayName(nameData);
      if (nameData.trim()) {
        setIsEditingName(false);
      }
    }
  }, [nameData, setDisplayName]);

  // --- Fetch user from database ---
  
  const fetchUserFromDb = async (walletAddress) => {
    try {
      const response = await axios.get(`${API_BASE}/users/${walletAddress}`);
      if (response.data && response.data.displayName) {
        // Use DB data as fallback if blockchain data not available yet
        if (!nameData) {
          setDisplayName(response.data.displayName);
        }
      }
    } catch (error) {
      // User might not exist in DB yet
      console.log('User not found in DB or error:', error.message);
    }
  };

  // --- Save display name to database (after blockchain confirmation) ---
  
  const saveDisplayNameToDb = async (name, walletAddress) => {
    try {
      setSavingToDb(true);
      const response = await axios.post(`${API_BASE}/users/set-display-name`, {
        walletAddress,
        displayName: name
      });
      
      if (response.data.success) {
        console.log('✅ Display name saved to database');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save display name to database:', error);
      toast.error('Failed to save name to database');
      return false;
    } finally {
      setSavingToDb(false);
    }
  };

  // --- Effect to handle transaction state (loading/success/error) ---
  
  useEffect(() => {
    const handleTransactionFlow = async () => {
      if (isPending) {
        toast.loading("Confirm transaction in wallet...", { id: "setNameToast" });
      }
      
      if (isConfirming) {
        toast.loading("Setting name on blockchain...", { id: "setNameToast" });
      }
      
      if (isConfirmed) {
        toast.loading("Saving to database...", { id: "setNameToast" });
        
        // Save to database after blockchain confirmation
        const dbSaved = await saveDisplayNameToDb(newName, address);
        
        if (dbSaved) {
          toast.success("Name saved successfully!", { id: "setNameToast" });
          setDisplayName(newName);
          setNewName("");
          setIsEditingName(false);
          refetchName();
        } else {
          toast.error("Blockchain success but DB save failed", { id: "setNameToast" });
        }
      }

      if (isWriteError || isReceiptError) {
        const errorMsg = writeError?.shortMessage || receiptError?.shortMessage || "Transaction failed";
        console.error("SetDisplayName Error:", writeError || receiptError);
        toast.error(`Error: ${errorMsg}`, { id: "setNameToast" });
      }
    };

    handleTransactionFlow();
  }, [
    isPending,
    isConfirming, 
    isConfirmed, 
    newName, 
    address,
    setDisplayName, 
    refetchName, 
    isWriteError, 
    writeError, 
    isReceiptError, 
    receiptError
  ]);

  // --- Handlers ---
  
  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      open(); 
    }
  };

  const handleSetDisplayName = async () => {
    if (!newName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    if (newName.trim().length > 32) {
      toast.error("Name must be 1-32 characters");
      return;
    }
    
    // Write to blockchain first
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'setDisplayName',
      args: [newName.trim()],
    });
  };

  const handleEditName = () => {
    setNewName(displayName);
    setIsEditingName(true);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="text-2xl sm:text-3xl font-bold hover:text-blue-200 transition-colors flex-shrink-0">
            🚀 MonadFeed
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md hover:bg-white/10 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            <Link 
              to="/" 
              className="hover:text-blue-200 transition-colors font-medium text-sm lg:text-base"
            >
              Home
            </Link>
            <Link 
              to="/curated" 
              className="hover:text-blue-200 transition-colors font-medium text-sm lg:text-base whitespace-nowrap"
            >
              Curated Articles
            </Link>
            
            {isConnected && (
              <div className="bg-yellow-500 text-gray-900 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg font-bold text-sm lg:text-base whitespace-nowrap">
                ⭐ {userPoints} Points
              </div>
            )}

            {isConnected && (
              <div className="flex gap-2 items-center">
                {displayName && !isEditingName ? (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                    <span className="font-medium text-sm lg:text-base">{displayName}</span>
                    <button
                      onClick={handleEditName}
                      className="text-blue-200 hover:text-white transition-colors"
                      title="Edit name"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Set Display Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()}
                      className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-white w-32 lg:w-36"
                      disabled={isPending || isConfirming || savingToDb}
                    />
                    <button
                      onClick={handleSetDisplayName}
                      disabled={isPending || isConfirming || savingToDb}
                      className="bg-purple-600 hover:bg-purple-700 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors whitespace-nowrap"
                    >
                      {isPending || isConfirming || savingToDb ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            )}
            
            <button
              onClick={handleWalletAction}
              className={`px-4 lg:px-6 py-2 rounded-lg font-medium transition-colors text-sm lg:text-base whitespace-nowrap ${
                isConnected
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnected 
                ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
                : '🔗 Connect'
              }
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-3">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block hover:bg-white/10 px-3 py-2 rounded-md font-medium transition-colors"
            >
              Home
            </Link>
            <Link 
              to="/curated" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block hover:bg-white/10 px-3 py-2 rounded-md font-medium transition-colors"
            >
              Curated Articles
            </Link>
            
            {isConnected && (
              <div className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-bold inline-block">
                ⭐ {userPoints} Points
              </div>
            )}

            {isConnected && (
              <div className="space-y-2">
                {displayName && !isEditingName ? (
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-lg">
                    <span className="font-medium flex-1">{displayName}</span>
                    <button
                      onClick={handleEditName}
                      className="text-blue-200 hover:text-white transition-colors p-1"
                      title="Edit name"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Set Display Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()}
                      className="flex-1 px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-white"
                      disabled={isPending || isConfirming || savingToDb}
                    />
                    <button
                      onClick={handleSetDisplayName}
                      disabled={isPending || isConfirming || savingToDb}
                      className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                    >
                      {isPending || isConfirming || savingToDb ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleWalletAction}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                isConnected
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isConnected 
                ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
                : '🔗 Connect Wallet'
              }
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
