// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MonadFeed
 * @dev Decentralized news curation and discussion platform
 * @notice Stores IPFS hashes for articles and comments, handles upvoting and points
 */
contract MonadFeed {
    
    // ============ Structs ============
    
    struct Article {
        string ipfsHash;        // CID of the article metadata on IPFS
        address curator;        // Address of the user who submitted the article
        uint256 upvoteCount;    // Total upvotes received
        uint256 timestamp;      // When the article was submitted
        bool exists;            // Flag to check if article exists
    }
    
    struct Comment {
        string ipfsHash;        // CID of the comment content on IPFS
        uint256 articleId;      // ID of the article this comment belongs to
        address commenter;      // Address of the user who posted the comment
        uint256 upvoteCount;    // Total upvotes received
        uint256 timestamp;      // When the comment was posted
        bool exists;            // Flag to check if comment exists
    }
    
    // ============ State Variables ============
    
    // Article storage
    mapping(uint256 => Article) public articles;
    uint256 public articleCount;
    
    // Comment storage
    mapping(uint256 => Comment) public comments;
    uint256 public commentCount;
    
    // Track comments per article for easy retrieval
    mapping(uint256 => uint256[]) public articleComments;
    
    // Points/Leaderboard system
    mapping(address => uint256) public userPoints;
    
    // Voting tracking to prevent double voting
    mapping(address => mapping(uint256 => bool)) public hasUpvotedArticle;
    mapping(address => mapping(uint256 => bool)) public hasUpvotedComment;
    
    // User display names
    mapping(address => string) public displayNames;
    
    // ============ Events ============
    
    event ArticleSubmitted(
        uint256 indexed articleId,
        string ipfsHash,
        address indexed curator,
        uint256 timestamp
    );
    
    event CommentPosted(
        uint256 indexed articleId,
        uint256 indexed commentId,
        string ipfsHash,
        address indexed commenter,
        uint256 timestamp
    );
    
    event ArticleUpvoted(
        uint256 indexed articleId,
        address indexed voter,
        address indexed curator,
        uint256 newUpvoteCount
    );
    
    event CommentUpvoted(
        uint256 indexed commentId,
        uint256 indexed articleId,
        address indexed voter,
        address commenter,
        uint256 newUpvoteCount
    );
    
    event PointsAwarded(
        address indexed user,
        uint256 pointsEarned,
        uint256 totalPoints
    );
    
    event DisplayNameSet(
        address indexed user,
        string displayName
    );
    
    // ============ Modifiers ============
    
    modifier articleExists(uint256 _articleId) {
        require(_articleId > 0 && _articleId <= articleCount, "Article does not exist");
        require(articles[_articleId].exists, "Article does not exist");
        _;
    }
    
    modifier commentExists(uint256 _commentId) {
        require(_commentId > 0 && _commentId <= commentCount, "Comment does not exist");
        require(comments[_commentId].exists, "Comment does not exist");
        _;
    }
    
    // ============ Article Functions ============
    
    /**
     * @dev Submit a new article by providing its IPFS hash
     * @param _ipfsHash The IPFS CID of the article metadata JSON
     */
    function submitArticle(string memory _ipfsHash) external {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        articleCount++;
        
        articles[articleCount] = Article({
            ipfsHash: _ipfsHash,
            curator: msg.sender,
            upvoteCount: 0,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit ArticleSubmitted(articleCount, _ipfsHash, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Upvote an article (individual transaction, no batching)
     * @param _articleId The ID of the article to upvote
     */
    function upvoteArticle(uint256 _articleId) external articleExists(_articleId) {
        require(!hasUpvotedArticle[msg.sender][_articleId], "Already upvoted this article");
        require(articles[_articleId].curator != msg.sender, "Cannot upvote your own article");
        
        // Mark as upvoted
        hasUpvotedArticle[msg.sender][_articleId] = true;
        
        // Increment article upvote count
        articles[_articleId].upvoteCount++;
        
        // Award points to the curator
        address curator = articles[_articleId].curator;
        userPoints[curator]++;
        
        emit ArticleUpvoted(
            _articleId,
            msg.sender,
            curator,
            articles[_articleId].upvoteCount
        );
        
        emit PointsAwarded(curator, 1, userPoints[curator]);
    }
    
    /**
     * @dev Get article details
     * @param _articleId The ID of the article
     * @return ipfsHash The IPFS CID
     * @return curator The address of the curator
     * @return upvoteCount The number of upvotes
     * @return timestamp When the article was submitted
     */
    function getArticle(uint256 _articleId) 
        external 
        view 
        articleExists(_articleId) 
        returns (
            string memory ipfsHash,
            address curator,
            uint256 upvoteCount,
            uint256 timestamp
        ) 
    {
        Article memory article = articles[_articleId];
        return (
            article.ipfsHash,
            article.curator,
            article.upvoteCount,
            article.timestamp
        );
    }
    
    // ============ Comment Functions ============
    
    /**
     * @dev Post a comment on an article
     * @param _articleId The ID of the article to comment on
     * @param _ipfsHash The IPFS CID of the comment content JSON
     */
    function postComment(uint256 _articleId, string memory _ipfsHash) 
        external 
        articleExists(_articleId) 
    {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        commentCount++;
        
        comments[commentCount] = Comment({
            ipfsHash: _ipfsHash,
            articleId: _articleId,
            commenter: msg.sender,
            upvoteCount: 0,
            timestamp: block.timestamp,
            exists: true
        });
        
        // Add comment ID to the article's comment list
        articleComments[_articleId].push(commentCount);
        
        emit CommentPosted(
            _articleId,
            commentCount,
            _ipfsHash,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Upvote a comment (individual transaction, no batching)
     * @param _commentId The ID of the comment to upvote
     */
    function upvoteComment(uint256 _commentId) external commentExists(_commentId) {
        require(!hasUpvotedComment[msg.sender][_commentId], "Already upvoted this comment");
        require(comments[_commentId].commenter != msg.sender, "Cannot upvote your own comment");
        
        // Mark as upvoted
        hasUpvotedComment[msg.sender][_commentId] = true;
        
        // Increment comment upvote count
        comments[_commentId].upvoteCount++;
        
        // Award points to the commenter
        address commenter = comments[_commentId].commenter;
        userPoints[commenter]++;
        
        emit CommentUpvoted(
            _commentId,
            comments[_commentId].articleId,
            msg.sender,
            commenter,
            comments[_commentId].upvoteCount
        );
        
        emit PointsAwarded(commenter, 1, userPoints[commenter]);
    }
    
    /**
     * @dev Get comment details
     * @param _commentId The ID of the comment
     * @return ipfsHash The IPFS CID
     * @return articleId The article this comment belongs to
     * @return commenter The address of the commenter
     * @return upvoteCount The number of upvotes
     * @return timestamp When the comment was posted
     */
    function getComment(uint256 _commentId) 
        external 
        view 
        commentExists(_commentId) 
        returns (
            string memory ipfsHash,
            uint256 articleId,
            address commenter,
            uint256 upvoteCount,
            uint256 timestamp
        ) 
    {
        Comment memory comment = comments[_commentId];
        return (
            comment.ipfsHash,
            comment.articleId,
            comment.commenter,
            comment.upvoteCount,
            comment.timestamp
        );
    }
    
    /**
     * @dev Get all comment IDs for a specific article
     * @param _articleId The ID of the article
     * @return An array of comment IDs
     */
    function getArticleComments(uint256 _articleId) 
        external 
        view 
        articleExists(_articleId) 
        returns (uint256[] memory) 
    {
        return articleComments[_articleId];
    }
    
    // ============ Leaderboard & Stats Functions ============
    
    /**
     * @dev Get a user's points
     * @param _user The address of the user
     * @return The user's total points
     */
    function getUserPoints(address _user) external view returns (uint256) {
        return userPoints[_user];
    }
    
    /**
     * @dev Get platform statistics
     * @return totalArticles Total number of articles submitted
     * @return totalComments Total number of comments posted
     */
    function getPlatformStats() 
        external 
        view 
        returns (uint256 totalArticles, uint256 totalComments) 
    {
        return (articleCount, commentCount);
    }
    
    /**
     * @dev Check if a user has upvoted a specific article
     * @param _user The address of the user
     * @param _articleId The ID of the article
     * @return true if the user has upvoted, false otherwise
     */
    function hasUserUpvotedArticle(address _user, uint256 _articleId) 
        external 
        view 
        returns (bool) 
    {
        return hasUpvotedArticle[_user][_articleId];
    }
    
    /**
     * @dev Check if a user has upvoted a specific comment
     * @param _user The address of the user
     * @param _commentId The ID of the comment
     * @return true if the user has upvoted, false otherwise
     */
    function hasUserUpvotedComment(address _user, uint256 _commentId) 
        external 
        view 
        returns (bool) 
    {
        return hasUpvotedComment[_user][_commentId];
    }
    
    /**
     * @dev Get a batch of articles (for pagination)
     * @param _startId Starting article ID (1-indexed)
     * @param _count Number of articles to retrieve
     * @return ids Array of article IDs
     * @return curators Array of curator addresses
     * @return upvoteCounts Array of upvote counts
     * @return timestamps Array of submission timestamps
     */
    function getArticlesBatch(uint256 _startId, uint256 _count) 
        external 
        view 
        returns (
            uint256[] memory ids,
            address[] memory curators,
            uint256[] memory upvoteCounts,
            uint256[] memory timestamps
        ) 
    {
        require(_startId > 0 && _startId <= articleCount, "Invalid start ID");
        
        uint256 endId = _startId + _count - 1;
        if (endId > articleCount) {
            endId = articleCount;
        }
        
        uint256 actualCount = endId - _startId + 1;
        
        ids = new uint256[](actualCount);
        curators = new address[](actualCount);
        upvoteCounts = new uint256[](actualCount);
        timestamps = new uint256[](actualCount);
        
        for (uint256 i = 0; i < actualCount; i++) {
            uint256 articleId = _startId + i;
            Article memory article = articles[articleId];
            
            ids[i] = articleId;
            curators[i] = article.curator;
            upvoteCounts[i] = article.upvoteCount;
            timestamps[i] = article.timestamp;
        }
        
        return (ids, curators, upvoteCounts, timestamps);
    }
    
    // ============ User Profile Functions ============
    
    /**
     * @dev Set or update the display name for the caller
     * @param _newName The new display name (1-32 characters)
     */
    function setDisplayName(string memory _newName) external {
        uint256 nameLength = bytes(_newName).length;
        require(nameLength >= 1 && nameLength <= 32, "Display name must be 1-32 characters");
        
        displayNames[msg.sender] = _newName;
        
        emit DisplayNameSet(msg.sender, _newName);
    }
    
    /**
     * @dev Get the display name for a user
     * @param _user The address of the user
     * @return The user's display name (empty string if not set)
     */
    function getDisplayName(address _user) external view returns (string memory) {
        return displayNames[_user];
    }
}