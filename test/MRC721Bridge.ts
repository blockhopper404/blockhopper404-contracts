import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect, } from "chai";
import { ethers, upgrades } from "hardhat";
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";
import { BlockHopper, MRC721Bridge, IMuonClient } from "../typechain-types";
import {  Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";


describe("MRC721Bridge", function() {
  const rarityBytes = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";

  let admin: Signer;
  let user1: Signer;
  let tokenAdder: Signer;
  let token: BlockHopper;
  let mrc721Bridge: MRC721Bridge;
  let contractChainId: bigint;
  let toChain: bigint;
  let tokenId: bigint;
  let appId: String = "14133107918753457905122726879005594497699931608290848063847062588349373557837";
  let muonPublicKey: IMuonClient.PublicKeyStruct = {
    x: "0x4fad372492f60aaa060ed514c65c0638e9555aaf08b92a2e3dad72b45d172889",
    parity: "0"
  }


  before(async () => {
    [
      admin,
      user1,
      tokenAdder
    ] = await ethers.getSigners();
    contractChainId = (await ethers.provider.getNetwork()).chainId;
    toChain = 10n;
    tokenId = 1n;
  });

  const deployContracts = async () => {
    let tokenContract = await ethers.deployContract("BlockHopper", [""]);
    token = await tokenContract.waitForDeployment();

    const depositContract = await ethers.deployContract("MRC721Bridge", [appId, muonPublicKey, user1]);
    mrc721Bridge = await depositContract.waitForDeployment();
    await mrc721Bridge.waitForDeployment();
    await mrc721Bridge.grantRole(await mrc721Bridge.TOKEN_ADDER_ROLE(), tokenAdder);
    await token.mint(user1, ethers.parseEther("100"), rarityBytes);

    await token.setWhitelist(mrc721Bridge, true);
    return {
      token,
      mrc721Bridge
    }
  }

  beforeEach( async function() {
    ({token, mrc721Bridge} = await loadFixture(deployContracts));
  })

  describe("Deposit", function() {
    const amount = ethers.parseEther("10");
    const nftID = 1;
    it("Reverts if to_chain is the contract's network", async function() {
      await expect(mrc721Bridge.connect(user1).depositFor(user1, [nftID], contractChainId, tokenId))
      .revertedWith("Self Deposit");
    })

    it("Reverts if depositor doesn't approve", async function() {
      await mrc721Bridge.connect(tokenAdder).addToken(1, token);
      await expect(mrc721Bridge.connect(user1).depositFor(user1, [nftID], toChain, tokenId))
      .to.revertedWithCustomError(token, "Unauthorized");
    })

    it("Reverts when the token doesn't add", async function() {
      await expect(mrc721Bridge.connect(user1).depositFor(user1, [nftID], toChain, tokenId))
      .revertedWith("!tokenId");
    })

    describe("When the token is added", function() {
      beforeEach("Add the token address and deposit some tokens", async function() {
        await mrc721Bridge.connect(tokenAdder).addToken(1, token);
        await token.connect(user1).approve(mrc721Bridge, nftID);
        await mrc721Bridge.connect(user1).depositFor(user1, [nftID], toChain, tokenId);
      })

      it("Tx info", async function() {
        const tx = await mrc721Bridge.txs(1);
        expect(tx.tokenId).to.equal(1);
        expect(tx.toChain).to.equal(toChain);
        expect(tx.user).to.equal(user1);
      })

    })
  })

})