// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "src/MFD.sol";

contract DeployMFD is Script {
    function run() external returns (address) {
        vm.startBroadcast();

        // Get the deployer address from the private key
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        // Deploy the token, passing the deployer as the initial owner
        MFDToken mfd = new MFDToken(deployer);

        vm.stopBroadcast();
        
        console.log("MFD Token deployed to:", address(mfd));
        return address(mfd);
    }
}