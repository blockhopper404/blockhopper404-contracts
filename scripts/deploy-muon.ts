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
      x: "0x5b142300652a5e179ac588349b506c53bf045663c68812308d0dec243c44b0ef",
      parity: 1
    }
  ];
  const contract = await ethers.deployContract("MuonClient", params);

  await contract.waitForDeployment();

  console.log(`contract deployed to ${await contract.getAddress()}`);
  
  await sleep(20000);

  await run("verify:verify", {
    address: await contract.getAddress(),
    constructorArguments: params,
    // contract: "contracts/examples/ERC404m.sol:ERC404m"
    contract: "contracts/MuonClient.sol:MuonClient"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
