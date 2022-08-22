import fs from "fs";
import dotenv from "dotenv";
import ethers from "ethers";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

dotenv.config();

async function getAbiAt(address, proxy) {
  if (proxy)
    address = await getImplementationAddress(
      new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL),
      address
    );

  const res = await fetch(
    `https://api.etherscan.io/api?module=contract&action=getabi&address=${address}&apikey=${process.env.ETHERSCAN_API_KEY}`
  );
  const json = await res.json();
  if (json.status !== "1") throw new Error(json.result);

  return JSON.parse(json.result);
}

const implContracts = {
  DAI: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", proxy: false },
  WETH9: { address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", proxy: false },
  Lens: { address: "0x930f1b46e1D081Ec1524efD95752bE3eCe51EF67", proxy: true },
  Morpho: { address: "0x8888882f8f843896699869179fB6E4f7e3B58888", proxy: true },
  Oracle: { address: "0x65c816077C29b557BEE980ae3cC2dCE80204A0C5", proxy: false },
};

Object.entries(implContracts).forEach(async ([name, { address, proxy }]) => {
  const abi = await getAbiAt(address, proxy);

  fs.writeFileSync(`./abis/${name}.json`, JSON.stringify(abi, null, 2));
});
