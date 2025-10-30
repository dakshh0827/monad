import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useArticleStore } from "../stores/articleStore";
import { useWeb3Modal } from '@web3modal/wagmi/react'
import { useAccount, useReadContract, useDisconnect, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../wagmiConfig"; // Import from new config file
import toast from "react-hot-toast";

export default function Navbar() {
  const { userPoints, displayName, setUserPoints, setDisplayName } = useArticleStore();
  const [newName, setNewName] = useState("");
  
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
  
  // NEW: Get error state from the hooks
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

  // --- Effect to handle transaction state (loading/success/error) ---
  
  useEffect(() => {
    if (isConfirming) {
      toast.loading("Setting name...", { id: "setNameToast" });
    }
    if (isConfirmed) {
      toast.success("Name set successfully!", { id: "setNameToast" });
      setDisplayName(newName); // Update the global store
      setNewName(""); // Clear input
      refetchName(); // Refetch from contract to be 100% sure
    }

    // NEW: Handle and show errors
    if (isWriteError || isReceiptError) {
      // Get the specific error message
      const errorMsg = writeError?.shortMessage || receiptError?.shortMessage || "An unknown error occurred.";
      console.error("SetDisplayName Error:", writeError || receiptError);
      toast.error(`Error: ${errorMsg}`, { id: "setNameToast" });
    }
  }, [
      isConfirming, isConfirmed, newName, setDisplayName, refetchName, 
      isWriteError, writeError, isReceiptError, receiptError // Add error dependencies
  ]);

  // --- Handlers ---
  
  const handleWalletAction = () => {
    if (isConnected) {
      disconnect();
    } else {
      open(); 
    }
  };

  const handleSetDisplayName = () => {
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
    <nav className="bg-linear-to-r from-blue-900 to-indigo-900 text-white px-8 py-4 shadow-lg">
      <div className="container mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-3xl font-bold hover:text-blue-200 transition-colors">
          🚀 MonadFeed
        </Link>
        
        {/* Navigation Links */}
        <div className="flex items-center gap-4">
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
          
          {isConnected && (
            <div className="bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg font-bold">
              ⭐ {userPoints} Points
            </div>
          )}

          {isConnected && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={displayName || "Set Display Name"}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/20 text-white placeholder-white/70 text-sm focus:outline-none focus:ring-2 focus:ring-white w-36"
              />
              <button
                onClick={handleSetDisplayName}
                disabled={isPending || isConfirming} // Button is disabled while writing or confirming
                className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {isPending || isConfirming ? "Saving..." : "Save"}
              </button>
            </div>
          )}
          
          <button
            onClick={handleWalletAction}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
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
      </div>
    </nav>
  );
}