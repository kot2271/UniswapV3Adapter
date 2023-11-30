// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// ERC20 contract declaration using OpenZeppelin
contract TestToken is ERC20, AccessControl {

    // Address of the contract owner
    address public owner;

    /**
     * @notice Constant for admin role
     */
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Constructor to initialize the token name and symbol on deployment.
    constructor(string memory tokenName, string memory tokenSymbol) ERC20(tokenName, tokenSymbol) {
        owner = msg.sender;
        _grantRole(ADMIN_ROLE, owner);
        _mint(msg.sender, 20 ether);
    }

    // Function for minting new tokens by the contract owner
    function mint(address account, uint256 amount) public {
        require(hasRole(ADMIN_ROLE, _msgSender()), "TestToken: must have admin role to mint");
        _mint(account, amount);
    }
}