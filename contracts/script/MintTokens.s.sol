// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "src/MFD.sol";

contract MintTokens is Script {
    function run() external {
        // Get addresses from environment
        address mfdTokenAddress = vm.envAddress("MFD_TOKEN_ADDRESS");
        address mfdClaimerAddress = vm.envAddress("MFD_CLAIMER_ADDRESS");
        
        require(mfdTokenAddress != address(0), "MFD_TOKEN_ADDRESS not set");
        require(mfdClaimerAddress != address(0), "MFD_CLAIMER_ADDRESS not set");

        // 1 Million tokens, adjusting for 18 decimals
        uint256 amountToMint = 1_000_000 * (10**18);

        // Get an instance of the deployed MFDToken contract
        MFDToken mfd = MFDToken(mfdTokenAddress);

        vm.startBroadcast();

        // Call the mint function on the token
        mfd.mint(mfdClaimerAddress, amountToMint);

        vm.stopBroadcast();

        console.log("Successfully minted", amountToMint / (10**18), "MFD tokens to the Claimer contract.");
    }
}