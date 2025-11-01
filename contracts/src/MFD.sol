// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/token/ERC20/ERC20.sol";
import "@openzeppelin/access/Ownable.sol";

/**
 * @title MFDToken
 * @dev A simple ERC20 token, mintable only by the owner (you).
 */
contract MFDToken is ERC20, Ownable {
    
    /**
     * @dev Sets the token name and symbol.
     * The `initialOwner` will be the address that deploys this contract.
     */
    constructor(address initialOwner) ERC20("MonadFeed Token", "MFD") Ownable(initialOwner) {
        // You can pre-mint some tokens to yourself if you want, but it's
        // better to mint them to the Claimer contract later.
    }

    /**
     * @dev Public function to mint tokens. Only the owner can call this.
     * This is how you will create the total supply for your rewards.
     * @param to The address to mint tokens to.
     * @param amount The amount of tokens to mint.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}