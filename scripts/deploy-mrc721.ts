import { ethers, run } from "hardhat"


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {

  let params = [
    "19866098776798229919834869251841045104024839110165600735185272607591717537782",
    {
      x: "0x62abd4dc05f3118594837f1ddb1d7f1060283d195a61ef9b6895d9e78a52c6d2",
      parity: 1
    },
    "0x9d34AC454DF11724bE4e11F0E9c9C9bd68bC8173",
  ];

  const contract = await ethers.deployContract("MRC721Bridge", params);

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
