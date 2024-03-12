//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {MRC404} from "./extensions/MRC404.sol";

contract BlockHopper is MRC404 {
  mapping(uint256 => uint256) public raritySeeds;
  string public baseTokenURI;

  event RaritySeedRemoved(
    address indexed caller,
    uint256 indexed id,
    uint256 indexed seed
  );

  constructor(
    string memory _baseTokenURI
  ) MRC404("BlockHopper", "GUN", 18, msg.sender) {
    baseTokenURI = _baseTokenURI;
    setSelfERC721TransferExempt(true);
    _grantRole(MINTER_ROLE, msg.sender);
  }

  function setBaseTokenURI(
    string memory _tokenURI
  ) external onlyRole(DAO_ROLE) {
    baseTokenURI = _tokenURI;
  }

  function setNameSymbol(
    string memory _name,
    string memory _symbol
  ) external onlyRole(DAO_ROLE) {
    name = _name;
    symbol = _symbol;
  }

  function getRaritySeed(uint256 _id) public view returns (uint256) {
    if (raritySeeds[_id] != 0) {
      return raritySeeds[_id];
    }

    return uint256(keccak256(abi.encode(block.chainid, _id)));
  }

  function tokenURI(uint256 _id) public view override returns (string memory) {
    uint256 raritySeed = getRaritySeed(_id);

    return
      string(
        abi.encodePacked(
          baseTokenURI,
          Strings.toString(raritySeed),
          "/",
          Strings.toString(block.chainid),
          "/",
          Strings.toString(_id)
        )
      );
  }

  function burnFrom(
    address from,
    uint256 amount
  ) public override returns (bytes memory nftData) {
    uint256[] memory nftIds = _burnFromERC20(from, amount);
    nftData = encodeData(nftIds);
    deleteRaritySeeds(nftIds);
  }

  function burnFrom(
    address from,
    uint256[] calldata nftIds
  ) public override returns (bytes memory nftData) {
    _burnFromERC721(from, nftIds);
    nftData = encodeData(nftIds);
    deleteRaritySeeds(nftIds);
  }

  function mint(
    address to,
    uint256 amount,
    bytes calldata data
  ) public override returns (uint256[] memory) {
    uint256[] memory nftIds = _mint(to, amount);
    uint8[] memory rarities = decodeData(data);
    uint256 nftIdsLength = nftIds.length;
    uint256 raritiesLength = rarities.length;
    for (uint256 i = 0; i < nftIdsLength; i++) {
      if (i < raritiesLength && rarities[i] != 0) {
        raritySeeds[nftIds[i]] = rarities[i];
      } else {
        raritySeeds[nftIds[i]] = getRaritySeed(nftIds[i]);
      }
    }
    return nftIds;
  }

  function encodeData(uint256 id) public view override returns (bytes memory) {
    return abi.encode(getRaritySeed(id));
  }

  function decodeData(
    bytes calldata data
  ) public pure returns (uint8[] memory rarities) {
    bytes[] memory bytesArray = abi.decode(data, (bytes[]));
    uint256 length = bytesArray.length;

    rarities = new uint8[](length);
    for (uint256 i = 0; i < length; i++) {
      rarities[i] = abi.decode(bytesArray[i], (uint8));
    }
  }

  function deleteRaritySeeds(uint256[] memory nftIds) internal {
    uint256 nftIdsLength = nftIds.length;
    for (uint256 i = 0; i < nftIdsLength; i++) {
      emit RaritySeedRemoved(msg.sender, nftIds[i], raritySeeds[nftIds[i]]);
      delete raritySeeds[nftIds[i]];
    }
  }
}