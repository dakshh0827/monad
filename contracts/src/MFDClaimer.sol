// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// 1. Interface for your OLD MonadFeed contract
interface IMonadFeed {
    // We only need the function we want to read
    function userPoints(address user) external view returns (uint256);
}

// 2. Interface for your NEW MFD Token contract
interface IMFDToken {
    // We only need the function we want to call
    function transfer(address to, uint256 amount) external returns (bool);
}

/**
 * @title MFDClaimer
 * @dev This contract reads points from the old MonadFeed contract
 * and transfers new MFD tokens to the user.
 */
contract MFDClaimer {
    
    // --- State Variables ---

    // The address of your OLD contract
    IMonadFeed public immutable monadFeed;
    
    // The address of your NEW token
    IMFDToken public immutable mfdToken;
    
    // How many MFD tokens a user gets per 1 point
    uint256 public constant POINTS_TO_TOKEN_RATE = 10 * (10**18); // 1 point = 10 MFD tokens

    // Mapping to prevent double-claiming
    mapping(address => bool) public hasClaimed;

    // --- Events ---
    event RewardClaimed(address indexed user, uint256 points, uint256 tokenAmount);

    /**
     * @dev Constructor
     * @param _monadFeedAddress The address of your DEPLOYED MonadFeed contract
     * @param _mfdTokenAddress The address of your NEWLY DEPLOYED MFDToken contract
     */
    constructor(address _monadFeedAddress, address _mfdTokenAddress) {
        monadFeed = IMonadFeed(_monadFeedAddress);
        mfdToken = IMFDToken(_mfdTokenAddress);
    }

    /**
     * @dev The main function for users to claim their rewards.
     * This is the function you will call from your frontend.
     */
    function claimReward() external {
        address user = msg.sender;
        
        // 1. Check if user has already claimed
        require(!hasClaimed[user], "MFDClaimer: You have already claimed your reward");

        // 2. Read points from the OLD MonadFeed contract
        uint256 points = monadFeed.userPoints(user);
        require(points > 0, "MFDClaimer: You have no points to claim");

        // 3. Calculate the token reward
        uint256 rewardAmount = points * POINTS_TO_TOKEN_RATE;
        
        // 4. Mark the user as claimed BEFORE transferring (prevents re-entrancy)
        hasClaimed[user] = true;

        // 5. Transfer the MFD tokens from THIS contract to the user
        // THIS STEP WILL FAIL if the Claimer contract doesn't own any MFD tokens!
        bool success = mfdToken.transfer(user, rewardAmount);
        require(success, "MFDClaimer: Token transfer failed");

        // 6. Emit an event
        emit RewardClaimed(user, points, rewardAmount);
    }
}