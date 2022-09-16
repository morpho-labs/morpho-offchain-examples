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

async function getTotalBorrowETH() {
  const [, , totalBorrowETH] = await lens.getTotalBorrow();

  return Number(ethers.utils.formatUnits(totalBorrowETH, 18)); // ETH amounts are always in 18 decimals
}

async function getTotalBorrowDAI() {
  const totalBorrowETH = await getTotalBorrowETH();
  const daiOraclePrice = await oracle.getAssetPrice(daiAddress); // in ETH (18 decimals), whatever the market

  return totalBorrowETH / Number(ethers.utils.formatUnits(daiOraclePrice, 18)); // ETH amounts are always in 18 decimals
}

async function getTotalDAIMarketBorrow() {
  const [borrowedP2P, borrowedOnPool] = await lens.getTotalMarketBorrow(
    aDaiAddress // the DAI market, represented by the aDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(borrowedP2P.add(borrowedOnPool), daiDecimals));
}

async function getWBTCBorrowBalance() {
  const [borrowedOnPool, borrowedP2P] = await lens.getCurrentBorrowBalanceInOf(
    aWbtcAddress, // the WBTC market, represented by the aWBTC ERC20 token
    signer.address // the address of the user you want to get the borrow of
  );

  return Number(ethers.utils.formatUnits(borrowedP2P.add(borrowedOnPool), wbtcDecimals));
}

async function getWBTCBorrowBalanceETH() {
  const totalMarketBorrow = await getWBTCBorrowBalance();
  const wbtcOraclePrice = await oracle.getAssetPrice(wbtcAddress); // in ETH (18 decimals), whatever the market

  return totalMarketBorrow * Number(ethers.utils.formatUnits(wbtcOraclePrice, 18));
}

async function getWBTCBorrowBalanceDAI() {
  const marketBorrowETH = await getWBTCBorrowBalanceETH();
  const daiOraclePrice = await oracle.getAssetPrice(daiAddress); // in ETH (18 decimals), whatever the market

  return marketBorrowETH * Number(ethers.utils.formatUnits(daiOraclePrice, 18));
}

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getDAIAvgBorrowAPR() {
  const [avgBorrowRatePerYear] = await lens.getAverageBorrowRatePerYear(
    aDaiAddress // the DAI market, represented by the aDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(avgBorrowRatePerYear, 27)); // 18 decimals, whatever the market
}

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getWBTCBorrowAPR() {
  const borrowRatePerYear = await lens.getCurrentUserBorrowRatePerYear(
    aWbtcAddress, // the DAI market, represented by the aDAI ERC20 token
    signer.address // the address of the user you want to get the borrow rate of
  );

  return Number(ethers.utils.formatUnits(borrowRatePerYear, 27)); // 18 decimals, whatever the market
}

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getWBTCNextBorrowAPR(amount) {
  const [nextBorrowRatePerYear] = await lens.getNextUserBorrowRatePerYear(
    aWbtcAddress, // the DAI market, represented by the aDAI ERC20 token
    signer.address, // the address of the user you want to get the next borrow rate of
    amount
  );

  return Number(ethers.utils.formatUnits(nextBorrowRatePerYear, 27)); // 18 decimals, whatever the market
}

getTotalBorrowETH().then((val) => console.log("Total borrow ETH", val));
getTotalBorrowDAI().then((val) => console.log("Total borrow DAI", val));
getTotalDAIMarketBorrow().then((val) => console.log("DAI borrow", val));
getWBTCBorrowBalance().then((val) => console.log("WBTC own borrow", val));
getWBTCBorrowBalanceETH().then((val) => console.log("WBTC own borrow ETH", val));
getWBTCBorrowBalanceDAI().then((val) => console.log("WBTC own borrow DAI", val));
getDAIAvgBorrowAPR().then((val) => console.log("DAI avg borrow APR", val));
getWBTCBorrowAPR().then((val) => console.log("WBTC borrow APR", val));
getWBTCNextBorrowAPR(ethers.utils.parseUnits("100", wbtcDecimals)).then((val) =>
  console.log("WBTC next borrow rate", val)
);

/// BORROW ///

async function borrowERC20(aTokenAddress, amount) {
  await morpho.borrow(aTokenAddress, amount);
}

async function borrowDAI(amount) {
  return borrowERC20(
    aDaiAddress, // the DAI market, represented by the aDAI ERC20 token
    amount
  );
  // signer now has _amount DAI: dai.balanceOf(signer.address) == _amount
}

async function borrowETH(amount) {
  await borrowERC20(
    aWethAddress, // the WETH market, represented by the cETH ERC20 token
    amount
  );

  // signer now has _amount WETH: weth.balanceOf(signer.address) == _amount
  return weth.withdraw(amount);
  // signer now has _amount ETH: signer.getBalance() == _amount
}

// borrowDAI(ethers.utils.parseUnits("100", daiDecimals));
// borrowETH(ethers.utils.parseEther(1));

/// REPAY ///

async function repayERC20(aTokenAddress, underlying, amount) {
  await underlying.approve(morpho.address, amount);
  await morpho.repay(
    aTokenAddress,
    signer.address, // the address of the user you want to supply on behalf of
    amount
  );
}

async function repayDAI(amount) {
  return repayERC20(
    aDaiAddress, // the DAI market, represented by the aDAI ERC20 token
    dai,
    amount
  );
}

async function repayETH(amount) {
  // first wrap ETH into WETH
  await weth.deposit({ value: amount });

  return repayERC20(
    aWethAddress, // the WETH market, represented by the cETH ERC20 token
    weth,
    amount
  );
}

// repayDAI(ethers.utils.parseUnits("100", daiDecimals));
// repayETH(ethers.utils.parseEther(1));
