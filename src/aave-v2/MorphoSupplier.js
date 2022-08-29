import dotenv from "dotenv";
import ethers from "ethers";

import DAIAbi from "../../abis/Dai.json" assert { type: "json" };
import WETH9Abi from "../../abis/WETH9.json" assert { type: "json" };
import LensAbi from "../../abis/aave-v2/Lens.json" assert { type: "json" };
import MorphoAbi from "../../abis/aave-v2/Morpho.json" assert { type: "json" };
import OracleAbi from "../../abis/aave-v2/AaveOracle.json" assert { type: "json" };

dotenv.config();

const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL)
);

const signerAddress = await signer.getAddress();

const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const wbtcAddress = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";

const aWethAddress = "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e";
const aDaiAddress = "0x028171bCA77440897B824Ca71D1c56caC55b68A3";
const aWbtcAddress = "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656";

const wbtcDecimals = 8;
const daiDecimals = 18;

const dai = new ethers.Contract("0x6B175474E89094C44Da98b954EedeAC495271d0F", DAIAbi, signer);
const weth = new ethers.Contract("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", WETH9Abi, signer);
const lens = new ethers.Contract("0x507fA343d0A90786d86C7cd885f5C49263A91FF4", LensAbi, signer);
const morpho = new ethers.Contract("0x777777c9898d384f785ee44acfe945efdff5f3e0", MorphoAbi, signer);
const oracle = new ethers.Contract("0xA50ba011c48153De246E5192C8f9258A2ba79Ca9", OracleAbi, signer);

/// QUERY ///

async function getTotalSupplyETH() {
  const [, , totalSupplyETH] = await lens.getTotalSupply();

  return Number(ethers.utils.formatUnits(totalSupplyETH, 18)); // ETH amounts are always in 18 decimals
}

async function getTotalSupplyDAI() {
  const totalSupplyETH = await getTotalSupplyETH();
  const daiOraclePrice = await oracle.getAssetPrice(daiAddress); // in ETH (18 decimals), whatever the market

  return totalSupplyETH / Number(ethers.utils.formatUnits(daiOraclePrice, 18)); // ETH amounts are always in 18 decimals
}

async function getTotalDAIMarketSupply() {
  const [suppliedP2P, suppliedOnPool] = await lens.getTotalMarketSupply(
    aDaiAddress // the DAI market, represented by the aDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(suppliedP2P.add(suppliedOnPool), daiDecimals));
}

async function getWBTCSupplyBalance() {
  const [suppliedOnPool, suppliedP2P] = await lens.getCurrentSupplyBalanceInOf(
    aWbtcAddress, // the WBTC market, represented by the aWBTC ERC20 token
    signerAddress // the address of the user you want to get the supply of
  );

  return Number(ethers.utils.formatUnits(suppliedP2P.add(suppliedOnPool), wbtcDecimals));
}

async function getWBTCSupplyBalanceETH() {
  const totalMarketSupply = await getWBTCSupplyBalance();
  const wbtcOraclePrice = await oracle.getAssetPrice(wbtcAddress); // in ETH (18 decimals), whatever the market

  return totalMarketSupply * Number(ethers.utils.formatUnits(wbtcOraclePrice, 18));
}

async function getWBTCSupplyBalanceDAI() {
  const wbtcSupplyBalance = await getWBTCSupplyBalanceETH();
  const daiOraclePrice = await oracle.getAssetPrice(daiAddress); // in ETH (18 decimals), whatever the market

  return wbtcSupplyBalance / Number(ethers.utils.formatUnits(daiOraclePrice, 18));
}

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getDAIAvgSupplyAPR() {
  const [avgSupplyRatePerYear] = await lens.getAverageSupplyRatePerYear(
    aDaiAddress // the DAI market, represented by the aDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(avgSupplyRatePerYear, 27)); // 27 decimals, whatever the market
}

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getWBTCSupplyAPR() {
  const supplyRatePerYear = await lens.getCurrentUserSupplyRatePerYear(
    aWbtcAddress, // the DAI market, represented by the aDAI ERC20 token
    signerAddress // the address of the user you want to get the supply rate of
  );

  return Number(ethers.utils.formatUnits(supplyRatePerYear, 27)); // 27 decimals, whatever the market
}

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getWBTCNextSupplyAPR(amount) {
  const [nextSupplyRatePerYear] = await lens.getNextUserSupplyRatePerYear(
    aWbtcAddress, // the DAI market, represented by the aDAI ERC20 token
    signerAddress, // the address of the user you want to get the next supply rate of
    amount
  );

  return Number(ethers.utils.formatUnits(nextSupplyRatePerYear, 27)); // 27 decimals, whatever the market
}

getTotalSupplyETH().then((val) => console.log("Total supply ETH", val));
getTotalSupplyDAI().then((val) => console.log("Total supply DAI", val));
getTotalDAIMarketSupply().then((val) => console.log("DAI supply", val));
getWBTCSupplyBalance().then((val) => console.log("WBTC own supply", val));
getWBTCSupplyBalanceETH().then((val) => console.log("WBTC own supply ETH", val));
getWBTCSupplyBalanceDAI().then((val) => console.log("WBTC own supply DAI", val));
getDAIAvgSupplyAPR().then((val) => console.log("DAI avg supply APR", val));
getWBTCSupplyAPR().then((val) => console.log("WBTC supply APR", val));
getWBTCNextSupplyAPR(ethers.utils.parseUnits("100", wbtcDecimals)).then((val) =>
  console.log("WBTC next supply rate", val)
);

/// SUPPLY ///

async function supplyERC20(aTokenAddress, underlying, amount) {
  await underlying.approve(morpho.address, amount);
  await morpho.supply(
    aTokenAddress,
    signerAddress, // the address of the user you want to supply on behalf of
    amount
  );
}

async function supplyDAI(amount) {
  return supplyERC20(
    aDaiAddress, // the DAI market, represented by the aDAI ERC20 token
    dai,
    amount
  );
}

async function supplyETH(amount) {
  // first wrap ETH into WETH
  await weth.deposit({ value: amount });

  return supplyERC20(
    aWethAddress, // the WETH market, represented by the cETH ERC20 token
    weth,
    amount
  );
}

// supplyDAI(ethers.utils.parseUnits("100", daiDecimals));
// supplyETH(ethers.utils.parseEther(1));

/// WITHDRAW ///

async function withdrawERC20(aTokenAddress, amount) {
  await morpho.withdraw(aTokenAddress, amount);
}

async function withdrawDAI(amount) {
  return withdrawERC20(
    aDaiAddress, // the DAI market, represented by the aDAI ERC20 token
    amount
  );
  // signer now has _amount WETH: dai.balanceOf(signerAddress) == _amount
}

async function withdrawETH(amount) {
  await withdrawERC20(
    aWethAddress, // the WETH market, represented by the cETH ERC20 token
    amount
  );

  // signer now has _amount WETH: weth.balanceOf(signerAddress) == _amount
  return weth.withdraw(amount);
  // signer now has _amount ETH: signer.getBalance() == _amount
}

// withdrawDAI(ethers.utils.parseUnits(100, 18)); // DAI has 18 decimals
// withdrawETH(ethers.utils.parseEther(1));
