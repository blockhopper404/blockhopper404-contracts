import { ethers, run } from "hardhat"


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  // var params = [
  //   "https://metadata.blockhopper.tech/"
  // ];

  let params = [
    "53120355698192387072724812431559611174522160227652914000765746326019258354428",
    {
      x: "0x2c4adf652a610b33ba466a60712882fdaf418ed19abd6f69b1665c4ae27a64ea",
      parity: 1
    },
    "0x9d34AC454DF11724bE4e11F0E9c9C9bd68bC8173",
  ];

  const contract = await ethers.deployContract("MRC20Bridge", params);

  await contract.waitForDeployment();

  console.log(`contract deployed to ${await contract.getAddress()}`);
  
  await sleep(20000);

  await run("verify:verify", {
    address: await contract.getAddress(),
    constructorArguments: params,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
