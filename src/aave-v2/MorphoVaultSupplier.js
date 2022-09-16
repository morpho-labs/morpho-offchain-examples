import dotenv from "dotenv";
import ethers from "ethers";

import DAIAbi from "../../abis/Dai.json" assert { type: "json" };
import SupplyVaultAbi from "../../abis/aave-v2/SupplyVault.json" assert { type: "json" };

dotenv.config();

const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL)
);

const daiDecimals = 18;

const dai = new ethers.Contract("0x6B175474E89094C44Da98b954EedeAC495271d0F", DAIAbi, signer);
const maDai = new ethers.Contract(
  "0xd99D793B8FDaE42C1867293C172b9CBBD3ea49FF",
  SupplyVaultAbi,
  signer
);

/// QUERY ///

async function getBalanceOfDai(address) {
  const shares = await maDai.balanceOf(address);
  const assets = await maDai.convertToAssets(shares);

  return Number(ethers.utils.formatUnits(assets, daiDecimals));
}

getBalanceOfDai(signer.address).then((val) => console.log("Total DAI balance", val));

/// SUPPLY ///

const amount = ethers.utils.parseUnits("100", daiDecimals);

// dai.approve(maDai.address, amount);
// maDai.deposit(amount, signer.address);

/// WITHDRAW ///

// maDai.withdraw(amount, signer.address, signer.address);
