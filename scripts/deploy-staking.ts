import { ethers, upgrades, run } from "hardhat";

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  let params = [
    "0xa077C4adD9564214dDc77a607F73B4f4c48F8eB8",
    "0xa077C4adD9564214dDc77a607F73B4f4c48F8eB8",
  ];

  const Factory = await ethers.getContractFactory("MRC404Staking");
  const contract = await upgrades.deployProxy(Factory, params);
  await contract.waitForDeployment();
  console.log("Contract deployed to:", await contract.getAddress());

  await sleep(20000);

  await run("verify:verify", {
    address: await contract.getAddress()
  });

  // const contract = await upgrades.upgradeProxy("0xAb4b932543EF6c5eB241c40f101E68B1E2475319", Factory);
  // console.log("contract upgraded");
}

// async function main() {

//   const factory = await ethers.getContractFactory("SchnorrSECP256K1Verifier");

//   const contract = await factory.deploy();

//   await contract.deployed();

//   console.log("Contract deployed to:", contract.address);
// }


main().catch((error) => {
  console.error(error);
  process.exit(1);
});