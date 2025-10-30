// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/MonadFeed.sol";

contract DeployMonadFeed is Script {
    function run() external returns (address) {
        vm.startBroadcast(); // Start broadcasting transactions

        MonadFeed monadFeed = new MonadFeed(); // Deploy your contract

        vm.stopBroadcast(); // Stop broadcasting

        console.log("MonadFeed deployed to:", address(monadFeed));
        return address(monadFeed);
    }
}