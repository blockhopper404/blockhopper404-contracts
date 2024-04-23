// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IMRC404.sol";

contract BlockHopperVesting is Ownable {
  mapping(address => uint256) public balances;
  mapping(address => uint256) public claimed;

  uint256 public startDate;
  uint256 public period = 30 days;
  IMRC404 public token;

  constructor(
    IMRC404 _token,
    uint256 _startDate,
    uint256 _period
  ) Ownable(msg.sender) {
    token = _token;
    startDate = _startDate;
    period = _period;
  }

  function depositFor(address user, uint256 amount) public onlyOwner {
    token.transferFrom(msg.sender, address(this), amount);
    balances[user] += amount;
  }

  function claim() external {
    uint256 claimableAmount = claimable(msg.sender);
    require(claimableAmount > 0, "0 amount");
    claimed[msg.sender] += claimableAmount;
    token.transfer(msg.sender, claimableAmount);
  }

  function claimable(address addr) public view returns (uint256) {
    uint256 passed = block.timestamp - startDate;
    if (passed >= period) {
      return balances[addr] - claimed[addr];
    }
    uint256 claimableAmount = (balances[addr] * passed) /
      period -
      claimed[addr];
    return claimableAmount;
  }
}
