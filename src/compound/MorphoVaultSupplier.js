import dotenv from "dotenv";
import ethers from "ethers";

import DAIAbi from "../../abis/Dai.json" assert { type: "json" };
import SupplyVaultAbi from "../../abis/compound/SupplyVault.json" assert { type: "json" };
import SupplyHarvestVaultAbi from "../../abis/compound/SupplyHarvestVault.json" assert { type: "json" };

dotenv.config();

const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL)
);

const daiDecimals = 18;
const compDecimals = 18;

const dai = new ethers.Contract("0x6B175474E89094C44Da98b954EedeAC495271d0F", DAIAbi, signer);
const mcDai = new ethers.Contract(
  "0xd99D793B8FDaE42C1867293C172b9CBBD3ea49FF",
  SupplyVaultAbi,
  signer
);
const mchDai = new ethers.Contract(
  "0x5CBead740564A2173983E48f94F36357C1954EAE",
  SupplyHarvestVaultAbi,
  signer
);

/// QUERY ///

async function getBalanceOfDai(address) {
  const shares = await mcDai.balanceOf(address);
  const assets = await mcDai.convertToAssets(shares);

  return Number(ethers.utils.formatUnits(assets, daiDecimals));
}

async function getUnclaimedRewards(address) {
  const rewardsData = await mcDai.userRewards(address);

  return Number(ethers.utils.formatUnits(rewardsData.unclaimed, compDecimals));
}

getBalanceOfDai(signer.address).then((val) => console.log("Total DAI balance", val));
getUnclaimedRewards(signer.address).then((val) => console.log("Total COMP rewards", val));

/// SUPPLY ///

const amount = ethers.utils.parseUnits("100", daiDecimals);

// dai.approve(mcDai.address, amount);
// mcDai.deposit(amount, signer.address);

// dai.approve(mchDai.address, amount);
// mchDai.deposit(amount, signer.address);

/// WITHDRAW ///

// mcDai.withdraw(amount, signer.address, signer.address);
// mchDai.withdraw(amount, signer.address, signer.address);

/// REWARDS ///

// mcDai.claimRewards(signer.address);
// mchDai.harvest();
