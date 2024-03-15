import {
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect, } from "chai";
import { ethers, upgrades } from "hardhat";
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";
import { BlockHopper, MRC404Staking } from "../typechain-types";
import { BigNumberish, Signer } from "ethers";
// import {} from "ethers"
import { time } from "@nomicfoundation/hardhat-network-helpers";


describe.only("MRC404Staking", function() {
  const rarityBytes = "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";

  let admin: Signer;
  let user1: Signer;
  let user2: Signer;
  let rewardRole: Signer;
  let daoRole: Signer;
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
      daoRole
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
    await mrcStaking.grantRole(await mrcStaking.DAO_ROLE(), daoRole);
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

      const numberOfDays = 2
      const addedDuration = oneDay * numberOfDays;
      let expectedRewardRate = rewardsInWei / BigInt(rewardPeriod);
      let expectedRewardPerToken = BigInt(addedDuration) * expectedRewardRate * units / stakedAmountInWei;

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

      describe.skip("Second user stake", function() {
        // let expectedRewardRate = rewardsInWei / BigInt(rewardPeriod);
        let expectedRewardPerToken_ = expectedRewardPerToken + BigInt(addedDuration) * expectedRewardRate * units / (stakedAmountInWei*2n);

        beforeEach("Increase time", async function() {
          await token.connect(user2).approve(mrcStaking, stakedAmountInWei);
          await mrcStaking.connect(user2).stake(stakedAmountInWei);
          this.user2Info = await mrcStaking.users(user2);
          await time.increase(addedDuration);
        })

        it("Check reward per token", async function() {
          expect(await mrcStaking.rewardPerToken()).to.closeTo(expectedRewardPerToken_, 64000);
        })

      })

    })

    describe("After period finished", function() {
      const numberOfDays = 14
      const addedDuration = oneDay * numberOfDays;
      let expectedRewardRate = rewardsInWei / BigInt(rewardPeriod);
      let expectedRewardPerToken = BigInt(rewardPeriod) * expectedRewardRate * units / stakedAmountInWei;

      beforeEach("Increase time", async function() {
        await time.increase(addedDuration);
        this.user1Info = await mrcStaking.users(user1);
      })

      it("Check reward per token", async function() {
        expect(await mrcStaking.rewardPerToken()).to.equal(expectedRewardPerToken);
      })

      it("Check earned amount", async function() {
        // const ratio = BigInt(10 / rewardPeriod);
        const expectedEarned = this.user1Info.balance * expectedRewardPerToken / units;
        expect(await mrcStaking.earned(user1)).to.equal(expectedEarned)
      })

    })

    describe("After two distributions", function() {
      const numberOfDays = 4;
      const addedDuration = numberOfDays * oneDay;
      beforeEach("Distribute some tokens for second time", async function() {
        const periodFinishBefore = await mrcStaking.periodFinish();

        await time.increase(addedDuration);
        const rewardPerTokenStored = await mrcStaking.rewardPerTokenStored();
        await mrcStaking.connect(rewardRole).distributeRewards(rewardsInWei);

        const remainingTime = periodFinishBefore - BigInt((await time.latest()));

        const leftOver = BigInt(remainingTime) * rewardsInWei / BigInt(rewardPeriod);
        this.expectedRewardRate = (rewardsInWei + leftOver) / BigInt(rewardPeriod);

        await time.increase(addedDuration);

        this.expectedRewardPerToken = rewardPerTokenStored + (BigInt(addedDuration) * this.expectedRewardRate * units) / stakedAmountInWei;

      })

      it("Check last update time", async function() {
        expect(await mrcStaking.lastUpdateTime())
        .to.equal((await time.latest()) - addedDuration);
      })

      it("Check reward rate", async function() {
        expect(await mrcStaking.rewardRate()).to.equal(this.expectedRewardRate);
      })

      it("Can increase stake amount", async function() {
        await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
        await mrcStaking.connect(user1).stake(stakedAmountInWei);
        await mrcStaking.connect(rewardRole).distributeRewards(rewardsInWei);
        expect((await mrcStaking.users(user1)).balance).to.equal(stakedAmountInWei*2n)
      })


      it("Total earned by user", async function() {
        let firstRewardPerToken = await mrcStaking.rewardPerTokenStored();
        const firstEarned = ((await mrcStaking.users(user1)).balance) * firstRewardPerToken / units;
        let rewardPerToken = await mrcStaking.rewardPerToken();
        const secondEarned = ((await mrcStaking.users(user1)).balance) * (rewardPerToken - firstRewardPerToken) / units;
        expect(await mrcStaking.earned(user1)).to.equal(firstEarned + secondEarned);
      })
    })

  })

  describe("Get Reward", function() {
    let stakedAmount = 40;
    let stakedAmountInWei = ethers.parseEther(stakedAmount.toString());
    const rewards = 20;
    const rewardsInWei = ethers.parseEther(rewards.toString());

    beforeEach("Stake and distribute some tokens", async function() {
      await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user1).stake(stakedAmountInWei);

      await token.connect(user2).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user2).stake(stakedAmountInWei/2n);
    })

    it("Reverts when function is paused", async function() {
      await mrcStaking.connect(daoRole).setFunctionPauseStatus("getReward", true);
      await expect(mrcStaking.connect(user1).getReward())
      .rejectedWith("Function is paused.")
    })

    it("Reverts before rewards distribution", async function() {
      await expect(mrcStaking.connect(user1).getReward())
      .rejectedWith("Invalid reward amount")
    })

    describe("After rewards distribution", function() {
      beforeEach("Stake and distribute some tokens", async function() {
        await mrcStaking.connect(rewardRole).distributeRewards(rewardsInWei);
      })

      it("Can get rewards after withdraw", async function() {
        await time.increase(rewardPeriod);
        await mrcStaking.connect(user1).withdraw();

        expect((await mrcStaking.users(user1)).balance).to.equal(0);
        await time.increase(oneDay);

        const earned = await mrcStaking.earned(user1);
        await expect(mrcStaking.connect(user1).getReward())
        .emit(mrcStaking, "RewardGot").withArgs(user1, earned);
      })

      const getRewardDesc = function(
        description: string,
        addedDuration: number
      ) {
        describe(description, function() {
          beforeEach("Stake and distribute some tokens", async function() {
            await time.increase(addedDuration);
            this.user1Reward = await mrcStaking.earned(user1);
            this.user1Tx = await mrcStaking.connect(user1).getReward();
            this.user2Reward = await mrcStaking.earned(user2);
            this.user2tx = await mrcStaking.connect(user2).getReward();
          })

          it("Decrease user rewards", async function() {
            expect(await mrcStaking.earned(user1)).to.approximately(0, 15432098765440);
            expect(await mrcStaking.earned(user2)).to.approximately(0, 15432098765440);
          })

          it("Check user paid reward", async function() {
            const user1Info = await mrcStaking.users(user1);
            const user2Info = await mrcStaking.users(user2);
            expect(user1Info.paidReward).to.approximately(this.user1Reward, 15432098765440);
            expect(user2Info.paidReward).to.approximately(this.user2Reward, 15432098765440);
          })

        })
      }

      getRewardDesc("Before period finished", oneDay * 5)
      getRewardDesc("In periodFinished time", rewardPeriod);
      getRewardDesc("After period finished", oneDay * 15);

    })
  })

  describe("Withdraw", function() {
    let stakedAmount = 50;
    let stakedAmountInWei = ethers.parseEther(stakedAmount.toString());
    const rewards = 20;
    const rewardsInWei = ethers.parseEther(rewards.toString());

    beforeEach("Stake and distribute some tokens", async function() {
      await token.connect(user1).approve(mrcStaking, stakedAmountInWei);
      await token.connect(user2).approve(mrcStaking, stakedAmountInWei);
      await mrcStaking.connect(user1).stake(stakedAmountInWei);
      await mrcStaking.connect(user2).stake(stakedAmountInWei / 2n);
    })

    it("Reverts when staker is locked", async function() {
      await mrcStaking.connect(rewardRole).setStakeLockStatus(user1, true);
      await expect(mrcStaking.connect(user1).withdraw())
      .revertedWith("Stake is locked.")
    })

    it("Reverts before waiting period", async function() {
      const twelveHours = 60 * 60 * 12;
      expect(await mrcStaking.withdrawalWaitingPeriod()).to.equal(twelveHours);
      await expect(mrcStaking.connect(user1).withdraw())
      .revertedWith("Withdrawal waiting period")
    })

    it("Reverts when user doesn't stake", async function() {
      await expect(mrcStaking.connect(daoRole).withdraw())
      .revertedWith("Invalid balance")
    })

    describe("Before distribution", async function() {
      beforeEach("Withdraw", async function() {
        await time.increase(5 * oneDay);
        this.withdrawTx = await mrcStaking.connect(user1).withdraw();
      })

      it("User balance decrease", async function() {
        expect((await mrcStaking.users(user1)).balance).to.equal(0);
      })

      it("Total staked decrease", async function() {
        expect((await mrcStaking.totalStaked())).to.equal(stakedAmountInWei / 2n);
      })

    })

    describe("After distribution", async function() {
      beforeEach("Increase time", async function() {
        await mrcStaking.connect(rewardRole).distributeRewards(rewardsInWei);
        await time.increase(5 * oneDay);
      })

      it("Before period finish", async function() {
        await mrcStaking.connect(user1).withdraw();
        expect((await mrcStaking.users(user1)).balance).to.equal(0);
      })

      it("After period finish", async function() {
        await time.increase(rewardPeriod);
        await expect(mrcStaking.connect(user1).withdraw())
        .to.emit(token, "ERC20Transfer").withArgs(mrcStaking, user1, stakedAmountInWei);
        expect((await mrcStaking.users(user1)).balance).to.equal(0);
      })

      it("After get rewards", async function() {
        await time.increase(rewardPeriod);
        const earned = await mrcStaking.earned(user1);
        await expect(mrcStaking.connect(user1).getReward())
        .emit(mrcStaking, "RewardGot").withArgs(user1, earned);

        await expect(mrcStaking.connect(user1).withdraw())
        .to.emit(token, "ERC20Transfer").withArgs(mrcStaking, user1, stakedAmountInWei);
        expect((await mrcStaking.users(user1)).balance).to.equal(0);
      })
    })

  })
})