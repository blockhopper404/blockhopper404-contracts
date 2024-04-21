// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./interfaces/IMRC404.sol";

//TODO: remove AcceccControl and use Ownable

contract BlockHopperVesting is AccessControl {
  bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

  mapping(address => uint256) public balances;
  mapping(address => uint256) public claimed;


  uint256 public startDate;
  uint256 public period = 30 days;
  IMRC404 token;

  constructor(
  	IMRC404 _token,
    uint256 _startDate,
    uint256 _period
  ) {
  	token = _token;
  	startDate = _startDate;
  	period = _period;
  }

  function depositFor(
    address user,
    uint256 amount
  ) public onlyRole(ADMIN_ROLE){
 	token.transferFrom(msg.sender, address(this), amount);
  	balances[user] += amount;
  }

  function claim() external {
  	uint256 claimable = claimable(msg.sender);
  	require(claimable > 0, "0 amount");
  	claimed[msg.sender] += claimable;
  	token.transfer(msg.sender, claimable);
  }

  function claimable(address addr) public view returns(uint256){
  	uint256 passed = block.timestamp - startDate;
  	if(passed >= period){
  		return balances[addr] - claimed[addr];
  	}
  	uint256 claimable = balances[addr]*passed/period - claimed[addr];
  	return claimable;
  }
}
