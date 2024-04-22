import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect, } from "chai";
import { ethers } from "hardhat";
import { ERC404m, BlockHopperVesting, IMuonClient } from "../typechain-types";
import { Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";


describe.only("BlockHopperVesting", function() {
  const rarityBytes = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";

  let owner: Signer;
  let user1: Signer;
  let user2: Signer;
  let token: ERC404m;
  let vestingContract: BlockHopperVesting;
  let oneDay: bigint;
  let tokenId: bigint;
  let appId: String = "14133107918753457905122726879005594497699931608290848063847062588349373557837";
  let muonPublicKey: IMuonClient.PublicKeyStruct = {
    x: "0x4fad372492f60aaa060ed514c65c0638e9555aaf08b92a2e3dad72b45d172889",
    parity: "0"
  }


  before(async () => {
    [
      owner,
      user1,
      user2,
    ] = await ethers.getSigners();
  });

  const deployContracts = async () => {
    let tokenContract = await ethers.deployContract("ERC404m", [""]);
    token = await tokenContract.waitForDeployment();
    oneDay = 86400n;
    const vestingContract_ = await ethers.deployContract("BlockHopperVesting", [token, await time.latest(), oneDay*30n]);
    vestingContract = await vestingContract_.waitForDeployment();
    await vestingContract.waitForDeployment();
    await token.mint(owner, ethers.parseEther("100"), rarityBytes);

    await token.setWhitelist(vestingContract, true);
    return {
      token,
      vestingContract
    }
  }

  beforeEach( async function() {
    ({token, vestingContract} = await loadFixture(deployContracts));
  })

  describe("Deposit", function() {
    const amount = ethers.parseEther("30");

    beforeEach('Deposit some tokens', async function () {
      await token.approve(vestingContract, amount);
      await vestingContract.depositFor(user1, amount);
    })

    it("Check user balance", async function() {
      expect(await vestingContract.balances(user1)).to.equal(amount);
    })

    it("Check period", async function() {
      expect(await vestingContract.period()).to.equal(oneDay * 30n);
    })

    it("Check claimable amount after period finished", async function() {
      await time.increase(oneDay*30n);
      expect(await vestingContract.claimable(user1)).to.equal(amount);
    })

    it("Check claimable amount after one day", async function() {
      await time.increase(oneDay);
      expect(await vestingContract.claimable(user1)).to.be.approximately(amount / 30n, 600000000000000);
    })

  })

  describe("Claim", function() {
    const amount = ethers.parseEther("30");

    beforeEach('Deposit some tokens', async function () {
      await token.approve(vestingContract, amount);
      await vestingContract.depositFor(user1, amount);
    })

    it("Reverts when there is no deposit", async function() {
      await expect(vestingContract.connect(user2).claim())
      .revertedWith("0 amount");
    })

    it("Reverts when the user tries to claim duplicate", async function() {
      await time.increase(oneDay * 30n);
      await vestingContract.connect(user1).claim();
      await time.increase(oneDay * 10n);
      await expect(vestingContract.connect(user1).claim())
      .revertedWith("0 amount");
    })

    it("Claim all balance", async function() {
      await time.increase(oneDay * 30n);
      await (expect(vestingContract.connect(user1).claim()))
      .to.emit(token, "ERC20Transfer").withArgs(vestingContract, user1, amount);
    })
  })

})