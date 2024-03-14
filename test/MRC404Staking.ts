import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect, } from "chai";
import { ethers, upgrades } from "hardhat";
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";
import { BlockHopper, MRC404Staking } from "../typechain-types";
import { BigNumberish, Signer } from "ethers";
import { time } from "@nomicfoundation/hardhat-network-helpers";


describe.only("MRC404Staking", function() {
  const rarityBytes = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";

  let admin: Signer;
  let user1: Signer;
  let user2: Signer;
  let rewardRole: Signer;
  let token: BlockHopper;
  let mrcStaking: MRC404Staking;
  let oneDay = 60*60*24;
  let rewardPeriod = oneDay * 10;
  const units: bigint = BigInt(10 ** 18);

  before(async () => {
    [
      admin,
      user1,
      user2,
      rewardRole,
    ] = await ethers.getSigners();
  });

  const deployContracts = async () => {
    let tokenContract = await ethers.deployContract("BlockHopper", [""]);
    token = await tokenContract.waitForDeployment();

    const stakingContract = await ethers.getContractFactory("MRC404Staking");
    mrcStaking = await upgrades.deployProxy(stakingContract, [
      await token.getAddress(),
      await token.getAddress(),
    ]);
    await mrcStaking.waitForDeployment();
    await token.mint(user1, ethers.parseEther("100"), rarityBytes);
    await token.mint(user2, ethers.parseEther("100"), rarityBytes);
    await token.setWhitelist(mrcStaking, true);
    await mrcStaking.grantRole(await mrcStaking.REWARD_ROLE(), rewardRole);
    return {
      token,
      mrcStaking
    }
  }

  beforeEach( async function() {
    ({token, mrcStaking} = await loadFixture(deployContracts));
  })

  describe("Stake", function() {
    let stakedAmount = 10;
    let stakedAmountInWei = ethers.parseEther(stakedAmount.toString());

    beforeEach("Stake some tokens", async function() {
      await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
      await token.connect(user2).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user1).stake(stakedAmountInWei);
      await mrcStaking.connect(user2).stake(stakedAmountInWei);
      await time.increase(oneDay * 12);
    })

    it("Increase user balance", async function() {
      expect((await mrcStaking.users(user1)).balance).to.equal(stakedAmountInWei);
    })

    it("Increase total staked", async function() {
      expect(await mrcStaking.totalStaked()).to.equal(stakedAmountInWei * 2n);
    })

    it("User increase stake amount", async function() {
      await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user1).stake(stakedAmountInWei);
      expect((await mrcStaking.users(user1)).balance).to.equal(stakedAmountInWei * 2n);
    })

  })

  describe("Distribute Rewards", function() {
    let stakedAmount = 50;
    let stakedAmountInWei = ethers.parseEther(stakedAmount.toString());
    const rewards = 20;
    const rewardsInWei = ethers.parseEther(rewards.toString());


    beforeEach("Stake and distribute some tokens", async function() {
      await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user1).stake(stakedAmountInWei);
      await mrcStaking.connect(rewardRole).distributeRewards(rewardsInWei);
    })

    describe("Before period finished", async function() {

      const numberOfDays = 5
      const addedDuration = oneDay * numberOfDays;
      const expectedRewardRate = rewardsInWei / BigInt(rewardPeriod);
      const expectedRewardPerToken = BigInt(addedDuration) * expectedRewardRate * units / stakedAmountInWei;

      beforeEach("Increase time", async function() {
        await time.increase(addedDuration);
        this.user1Info = await mrcStaking.users(user1);
      })

      it("Check reward per token", async function() {
        expect(await mrcStaking.rewardPerToken()).to.equal(expectedRewardPerToken);
      })

      it("Check earned amount", async function() {
        const ratio = BigInt(10 / numberOfDays);
        const expectedEarned = this.user1Info.balance * expectedRewardPerToken / units;
        expect(await mrcStaking.earned(user1)).to.equal(expectedEarned)
        .to.approximately(rewardsInWei / ratio, 64000)
      })

    })




    describe("After two distributions", function() {})


    describe("After period finished", function() {})
  })

})