// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token1 is ERC20 {
    constructor (uint256 initialSupply) ERC20 ("Gold1", "GLD1"){
        _mint(msg.sender, initialSupply);

    }

    function mint(address to, uint256 amound) public {
        _mint(to, amound);
    }
}