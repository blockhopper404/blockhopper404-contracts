import { ethers, run } from "hardhat"


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  var params = [
    "0x4Aec3858042cB536506abC1a200902E985f18166",
    "1713867506",
    "86400"
  ];

  const contract = await ethers.deployContract("BlockHopperVesting", params);

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
