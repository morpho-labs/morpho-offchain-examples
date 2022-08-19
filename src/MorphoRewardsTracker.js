import dotenv from "dotenv";
import ethers from "ethers";

dotenv.config();

const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL)
);

const signerAddress = await signer.getAddress();

const cDaiAddress = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const cCompAddress = "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4";

const compDecimals = 18;

const lens = new ethers.Contract(
  "0x930f1b46e1D081Ec1524efD95752bE3eCe51EF67",
  ["function getUserUnclaimedRewards(address[] calldata, address) external view returns (uint256)"],
  signer
);

const oracle = new ethers.Contract(
  "0x65c816077C29b557BEE980ae3cC2dCE80204A0C5",
  ["function getUnderlyingPrice(address) external view returns (uint256)"],
  signer
);

async function getUnclaimedComp() {
  const compRewards = await lens.getUserUnclaimedRewards(
    [cDaiAddress], // the markets to query unclaimed COMP rewards on
    signerAddress // the address of the user you want to query unclaimed COMP rewards of
  );

  return Number(ethers.utils.formatUnits(compRewards, compDecimals));
}

async function getUnclaimedCompUSD() {
  const compRewards = await getUnclaimedComp(
    [cDaiAddress], // the markets to query unclaimed COMP rewards on
    signerAddress // the address of the user you want to query unclaimed COMP rewards of
  );
  const oraclePrice = await oracle.getUnderlyingPrice(cCompAddress); // in (36 - nb decimals of WBTC = 28) decimals

  return compRewards * Number(ethers.utils.formatUnits(oraclePrice, 36 - compDecimals));
}

getUnclaimedComp().then((val) => console.log("unclaimed COMP rewards", val));
getUnclaimedCompUSD().then((val) => console.log("unclaimed COMP rewards USD", val));
