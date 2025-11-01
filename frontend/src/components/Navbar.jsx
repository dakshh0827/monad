// File: src/components/Navbar.jsx
// --- UPDATED WITH CLAIM LOGIC ---

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useDisconnect,
} from 'wagmi';
import toast from 'react-hot-toast';
import axios from 'axios';
import useArticleStore from '../stores/articleStore';
import {
  CONTRACT_ABI,
  CONTRACT_ADDRESS,
  // --- IMPORT YOUR NEW CONTRACTS ---
  MFD_TOKEN_ABI,
  MFD_TOKEN_ADDRESS,
  MFD_CLAIMER_ABI,
  MFD_CLAIMER_ADDRESS,
} from '../wagmiConfig';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const { open } = useWeb3Modal();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const { setDisplayName: setStoreDisplayName, displayName: storeDisplayName } =
    useArticleStore();

  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

  // --- Read from OLD MonadFeed Contract ---
  const { data: userPoints, refetch: refetchUserPoints } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getUserPoints',
    args: [address],
    enabled: isConnected && !!address,
  });

  const { data: displayName, refetch: refetchDisplayName } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getDisplayName',
    args: [address],
    enabled: isConnected && !!address,
  });

  // --- NEW: Read from MFD Token Contract ---
  const { data: mfdBalance, refetch: refetchMfdBalance } = useReadContract({
    address: MFD_TOKEN_ADDRESS,
    abi: MFD_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: isConnected && !!address,
  });

  // --- NEW: Read from MFD Claimer Contract ---
  const { data: hasClaimed, refetch: refetchHasClaimed } = useReadContract({
    address: MFD_CLAIMER_ADDRESS,
    abi: MFD_CLAIMER_ABI,
    functionName: 'hasClaimed',
    args: [address],
    enabled: isConnected && !!address,
  });

  // --- Write to OLD MonadFeed Contract (Set Name) ---
  const {
    data: nameHash,
    isPending: isSettingName,
    writeContract: setDisplayNameContract,
  } = useWriteContract();

  const { isLoading: isConfirmingName, isSuccess: isNameConfirmed } =
    useWaitForTransactionReceipt({ hash: nameHash });

  // --- NEW: Write to MFD Claimer Contract (Claim) ---
  const {
    data: claimHash,
    isPending: isClaiming,
    writeContract: claimRewards,
  } = useWriteContract();

  const { isLoading: isConfirmingClaim, isSuccess: isClaimConfirmed } =
    useWaitForTransactionReceipt({ hash: claimHash });

  // Update store display name when fetched from contract
  useEffect(() => {
    if (displayName) {
      setStoreDisplayName(displayName);
      setNewName(displayName);
    }
  }, [displayName, setStoreDisplayName]);

  // Handle Set Name logic
  const handleSetDisplayName = async () => {
    if (!newName || newName.length < 1 || newName.length > 32) {
      toast.error('Name must be 1-32 characters');
      return;
    }
    setDisplayNameContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'setDisplayName',
      args: [newName],
    });
  };

  // After name is confirmed on-chain, save to DB
  const saveDisplayNameToDb = async () => {
    try {
      await axios.post(`${API_BASE}/api/users/set-display-name`, {
        address,
        displayName: newName,
      });
      toast.success('Display name saved!');
      refetchDisplayName();
      setIsEditingName(false);
    } catch (error) {
      console.error('Failed to save display name to DB', error);
      toast.error('Error saving name to DB. Please try again.');
    }
  };

  useEffect(() => {
    if (isNameConfirmed) {
      saveDisplayNameToDb();
    }
  }, [isNameConfirmed]);

  // --- NEW: Handle Claim Token logic ---
  const handleClaim = async () => {
    if (!userPoints || userPoints === 0n) {
      toast.error('You have no points to claim!');
      return;
    }
    if (hasClaimed) {
      toast.error('You have already claimed your tokens!');
      return;
    }

    toast.loading('Confirm in your wallet...', { id: 'claim_toast' });
    claimRewards({
      address: MFD_CLAIMER_ADDRESS,
      abi: MFD_CLAIMER_ABI,
      functionName: 'claimReward',
      args: [], // No arguments needed
    });
  };

  // --- NEW: After claim is confirmed, refetch balances ---
  useEffect(() => {
    if (isConfirmingClaim) {
      toast.loading('Claiming tokens...', { id: 'claim_toast' });
    }
    if (isClaimConfirmed) {
      toast.success('Tokens Claimed!', { id: 'claim_toast' });
      refetchMfdBalance(); // Refresh $MFD balance
      refetchHasClaimed(); // Refresh claim status
      refetchUserPoints(); // Refresh points (though they don't change)
    }
  }, [isConfirmingClaim, isClaimConfirmed, refetchMfdBalance, refetchHasClaimed, refetchUserPoints]);

  const handleLogout = () => {
    disconnect();
    setStoreDisplayName('');
    navigate('/');
  };

  // --- NEW: Determine button states ---
  const isClaimButtonDisabled =
    isClaiming || isConfirmingClaim || hasClaimed || !userPoints || userPoints === 0n;
  
  const claimButtonText = () => {
    if (isClaiming) return 'Check Wallet...';
    if (isConfirmingClaim) return 'Confirming...';
    if (hasClaimed) return 'Tokens Claimed';
    if (!userPoints || userPoints === 0n) return 'No Points to Claim';
    return 'Claim $MFD';
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <Link to="/" className="navbar-logo">
          MonadFeed
        </Link>
        <Link to="/articles" className="navbar-link">
          Curated
        </Link>
        <Link to="/leaderboard" className="navbar-link">
          Leaderboard
        </Link>
      </div>
      <div className="navbar-user">
        {isConnected ? (
          <>
            <div className="navbar-info-item">
              <span className="info-label">Points</span>
              <span className="info-value">
                {userPoints !== undefined ? userPoints.toString() : '0'}
              </span>
            </div>

            {/* --- NEW: MFD BALANCE --- */}
            <div className="navbar-info-item">
              <span className="info-label">$MFD</span>
              <span className="info-value">
                {mfdBalance !== undefined
                  ? (Number(mfdBalance) / 1e18).toFixed(2)
                  : '0.00'}
              </span>
            </div>

            {/* --- NEW: CLAIM BUTTON --- */}
            <button
              className="btn btn-primary btn-claim"
              onClick={handleClaim}
              disabled={isClaimButtonDisabled}
            >
              {claimButtonText()}
            </button>

            {isEditingName ? (
              <div className="display-name-edit">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Set new name"
                  maxLength={32}
                />
                <button
                  onClick={handleSetDisplayName}
                  disabled={isSettingName || isConfirmingName}
                  className="btn btn-primary"
                >
                  {isSettingName || isConfirmingName ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="btn btn-secondary"
                title="Click to edit display name"
              >
                {storeDisplayName ||
                  `${address.slice(0, 6)}...${address.slice(-4)}`}
              </button>
            )}

            <button
              onClick={handleLogout}
              className="btn btn-secondary btn-logout"
            >
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => open()} className="btn btn-primary">
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}