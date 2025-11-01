import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useReadContract, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../wagmiConfig";
import toast from "react-hot-toast";
import axios from "axios";
import { Rocket, Menu, X, Star, Link2 } from "lucide-react";

const API_BASE = 'http://localhost:5000/api';

export default function Navbar() {
  const { userPoints, displayName, setUserPoints, setDisplayName } = useArticleStore();
  const [newName, setNewName] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savingToDb, setSavingToDb] = useState(false);
  
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { open } = useWeb3Modal();

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

  const { data: hash, isPending, writeContract, error: writeError, isError: isWriteError } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed, 
    error: receiptError, 
    isError: isReceiptError 
  } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isConnected && address) {
      refetchPoints();
      refetchName();
      fetchUserFromDb(address);
    } else {
      setUserPoints(0);
      setDisplayName('');
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
    }
  }, [nameData, setDisplayName]);

  const fetchUserFromDb = async (walletAddress) => {
    try {
      const response = await axios.get(`${API_BASE}/users/${walletAddress}`);
      if (response.data && response.data.displayName) {
        if (!nameData) {
          setDisplayName(response.data.displayName);
        }
      }
    } catch (error) {
      console.log('User not found in DB or error:', error.message);
    }
  };

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
        
        const dbSaved = await saveDisplayNameToDb(newName, address);
        
        if (dbSaved) {
          toast.success("Name saved successfully!", { id: "setNameToast" });
          setDisplayName(newName);
          setNewName("");
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
    
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'setDisplayName',
      args: [newName.trim()],
    });
  };

  return (
    <nav className="bg-black border-b-2 border-purple-600 sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center border-2 border-purple-500 transform group-hover:scale-110 transition-transform duration-300">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black text-white uppercase tracking-wide">
              MonadFeed
            </span>
          </Link>
          
          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-purple-950 border-2 border-purple-800 hover:border-purple-600 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-purple-400" />
            ) : (
              <Menu className="h-6 w-6 text-purple-400" />
            )}
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link 
              to="/" 
              className="relative text-white hover:text-purple-400 transition-colors font-bold uppercase text-sm tracking-wide group"
            >
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link 
              to="/curated" 
              className="relative text-white hover:text-purple-400 transition-colors font-bold uppercase text-sm tracking-wide group"
            >
              Curated Articles
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            
            {isConnected && (
              <div className="bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
                <span className="text-white font-bold flex items-center gap-2 uppercase text-sm">
                  <Star className="w-4 h-4 text-white" />
                  {userPoints} Points
                </span>
              </div>
            )}

            {isConnected && (
              <div className="flex gap-3 items-center">
                {displayName ? (
                  <div className="flex items-center gap-2 bg-purple-950 border-2 border-purple-800 px-4 py-2 rounded-lg">
                    <span className="font-bold text-white uppercase text-sm">{displayName}</span>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Set Display Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()}
                      className="px-4 py-2 rounded-lg bg-purple-950 border-2 border-purple-800 text-white placeholder-purple-500 focus:outline-none focus:border-purple-600 transition-colors w-40 font-bold"
                      disabled={isPending || isConfirming || savingToDb}
                    />
                    <button
                      onClick={handleSetDisplayName}
                      disabled={isPending || isConfirming || savingToDb}
                      className="bg-purple-600 hover:bg-purple-500 px-5 py-2 rounded-lg font-bold uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-white border-2 border-purple-500 transform hover:scale-105"
                    >
                      {isPending || isConfirming || savingToDb ? "Saving..." : "Save"}
                    </button>
                  </>
                )}
              </div>
            )}
            
            <button
              onClick={handleWalletAction}
              className={`px-6 py-2.5 rounded-lg font-bold uppercase text-sm transition-all duration-300 transform hover:scale-105 border-2 ${
                isConnected
                  ? 'bg-green-600 hover:bg-green-500 text-white border-green-500' 
                  : 'bg-purple-600 hover:bg-purple-500 text-white border-purple-500 flex items-center gap-2'
              }`}
            >
              {isConnected 
                ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
                : <><Link2 className="w-4 h-4" /> Connect</>
              }
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-6 space-y-4">
            <Link 
              to="/" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-white hover:text-purple-400 px-4 py-3 rounded-lg bg-purple-950 border-2 border-purple-800 hover:border-purple-600 transition-all font-bold uppercase text-sm"
            >
              Home
            </Link>
            <Link 
              to="/curated" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="block text-white hover:text-purple-400 px-4 py-3 rounded-lg bg-purple-950 border-2 border-purple-800 hover:border-purple-600 transition-all font-bold uppercase text-sm"
            >
              Curated Articles
            </Link>
            
            {isConnected && (
              <div className="bg-purple-950 border-2 border-purple-800 px-4 py-3 rounded-lg mx-4">
                <span className="text-white font-bold flex items-center gap-2 uppercase text-sm">
                  <Star className="w-5 h-5 text-purple-400" />
                  {userPoints} Points
                </span>
              </div>
            )}

            {isConnected && (
              <div className="space-y-3 px-4">
                {displayName ? (
                  <div className="flex items-center gap-2 bg-purple-950 border-2 border-purple-800 px-4 py-3 rounded-lg">
                    <span className="font-bold text-purple-300 flex-1 uppercase text-sm">{displayName}</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Set Display Name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSetDisplayName()}
                      className="flex-1 px-4 py-3 rounded-lg bg-purple-950 border-2 border-purple-800 text-white placeholder-purple-500 focus:outline-none focus:border-purple-600 transition-colors font-bold"
                      disabled={isPending || isConfirming || savingToDb}
                    />
                    <button
                      onClick={handleSetDisplayName}
                      disabled={isPending || isConfirming || savingToDb}
                      className="bg-purple-600 border-2 border-purple-500 px-5 py-3 rounded-lg font-bold uppercase text-sm disabled:opacity-50 transition-all text-white"
                    >
                      {isPending || isConfirming || savingToDb ? "..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={handleWalletAction}
              className={`w-full mx-4 px-6 py-3 rounded-lg font-bold uppercase text-sm transition-all border-2 flex items-center justify-center gap-2 ${
                isConnected
                  ? 'bg-green-600 text-white border-green-500' 
                  : 'bg-purple-600 text-white border-purple-500'
              }`}
            >
              {isConnected 
                ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` 
                : <><Link2 className="w-4 h-4" /> Connect Wallet</>
              }
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}