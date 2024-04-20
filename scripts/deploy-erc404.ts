import { ethers, run } from "hardhat"


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  var params = [
    "https://metadata.blockhopper.tech/"
  ];

  const contract = await ethers.deployContract("ERC404m", params);

  await contract.waitForDeployment();

  console.log(`contract deployed to ${await contract.getAddress()}`);
  
  await sleep(20000);

  await run("verify:verify", {
    address: await contract.getAddress(),
    constructorArguments: params,
    contract: "contracts/examples/ERC404m.sol:ERC404m"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
