import { ethers, run } from "hardhat"


function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  var params = [
    "https://erc404-metadata.muon.net/"
  ];

  // let params = [
  //   "70655544165943924617349807750778997082904918873493920083950003278771933644163",
  //   {
  //     x: "0x3e829573837a5606d1cbda3bede3b8881c2d35bedf83073dd8e5c4a32a873a0c",
  //     parity: 1
  //   },
  //   "0xDc572102Afb557130BF54E5636E0522eE8636793",
  // ];
  const contract = await ethers.deployContract("ERC404m", params);

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
