// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "src/MFDClaimer.sol";

contract DeployMFDClaimer is Script {
    function run() external returns (address) {
        // Get the addresses from environment variables
        address monadFeedAddress = vm.envAddress("MONADFEED_ADDRESS");
        address mfdTokenAddress = vm.envAddress("MFD_TOKEN_ADDRESS");

        require(monadFeedAddress != address(0), "MONADFEED_ADDRESS not set");
        require(mfdTokenAddress != address(0), "MFD_TOKEN_ADDRESS not set");

        vm.startBroadcast();
        
        // Deploy the claimer, passing in the two addresses
        MFDClaimer claimer = new MFDClaimer(monadFeedAddress, mfdTokenAddress);

        vm.stopBroadcast();

        console.log("MFD Claimer deployed to:", address(claimer));
        return address(claimer);
    }
}