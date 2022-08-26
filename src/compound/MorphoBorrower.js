import dotenv from "dotenv";
import ethers from "ethers";

import DAIAbi from "../../abis/Dai.json" assert { type: "json" };
import WETH9Abi from "../../abis/WETH9.json" assert { type: "json" };
import LensAbi from "../../abis/compound/Lens.json" assert { type: "json" };
import MorphoAbi from "../../abis/compound/Morpho.json" assert { type: "json" };
import OracleAbi from "../../abis/compound/UniswapAnchoredView.json" assert { type: "json" };

dotenv.config();

const signer = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  new ethers.providers.JsonRpcBatchProvider(process.env.RPC_URL)
);

const signerAddress = await signer.getAddress();

const cEthAddress = "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5";
const cDaiAddress = "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643";
const cWbtc2Address = "0xccF4429DB6322D5C611ee964527D42E5d685DD6a";

const wbtcDecimals = 8;
const daiDecimals = 18;

const dai = new ethers.Contract("0x6B175474E89094C44Da98b954EedeAC495271d0F", DAIAbi, signer);
const weth = new ethers.Contract("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", WETH9Abi, signer);
const lens = new ethers.Contract("0x930f1b46e1D081Ec1524efD95752bE3eCe51EF67", LensAbi, signer);
const morpho = new ethers.Contract("0x8888882f8f843896699869179fB6E4f7e3B58888", MorphoAbi, signer);
const oracle = new ethers.Contract("0x65c816077C29b557BEE980ae3cC2dCE80204A0C5", OracleAbi, signer);

/// QUERY ///

async function getTotalBorrowUSD() {
  const [, , totalBorrowUSD] = await lens.getTotalBorrow();

  return Number(ethers.utils.formatUnits(totalBorrowUSD, 18)); // USD amounts are always in 18 decimals
}

async function getTotalDAIMarketBorrow() {
  const [borrowedP2P, borrowedOnPool] = await lens.getTotalMarketBorrow(
    cDaiAddress // the DAI market, represented by the cDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(borrowedP2P.add(borrowedOnPool), daiDecimals));
}

async function getWBTCBorrowBalance() {
  const [borrowedOnPool, borrowedP2P] = await lens.getCurrentBorrowBalanceInOf(
    cWbtc2Address, // the WBTC market, represented by the cWBTC2 ERC20 token
    signerAddress // the address of the user you want to get the borrow of
  );

  return Number(ethers.utils.formatUnits(borrowedP2P.add(borrowedOnPool), wbtcDecimals));
}

async function getWBTCBorrowBalanceUSD() {
  const totalMarketBorrow = await getWBTCBorrowBalance();
  const oraclePrice = await oracle.getUnderlyingPrice(cWbtc2Address); // in (36 - nb decimals of WBTC = 28) decimals

  return totalMarketBorrow * Number(ethers.utils.formatUnits(oraclePrice, 36 - wbtcDecimals));
}

const nbBlocksPerYear = 4 * 60 * 24 * 365.25;

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getDAIAvgBorrowAPR() {
  const [avgBorrowRatePerBlock] = await lens.getAverageBorrowRatePerBlock(
    cDaiAddress // the DAI market, represented by the cDAI ERC20 token
  );

  return (
    Number(ethers.utils.formatUnits(avgBorrowRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getWBTCBorrowAPR() {
  const borrowRatePerBlock = await lens.getCurrentUserBorrowRatePerBlock(
    cWbtc2Address, // the DAI market, represented by the cDAI ERC20 token
    signerAddress // the address of the user you want to get the borrow rate of
  );

  return (
    Number(ethers.utils.formatUnits(borrowRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

// @note The borrow rate experienced on a market is specific to each user,
// @note dependending on how their borrow is matched peer-to-peer or borrowed to the Compound pool.
async function getWBTCNextBorrowAPR(amount) {
  const [nextBorrowRatePerBlock] = await lens.getNextUserBorrowRatePerBlock(
    cWbtc2Address, // the DAI market, represented by the cDAI ERC20 token
    signerAddress, // the address of the user you want to get the next borrow rate of
    amount
  );

  return (
    Number(ethers.utils.formatUnits(nextBorrowRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

getTotalBorrowUSD().then((val) => console.log("Total borrow USD", val));
getTotalDAIMarketBorrow().then((val) => console.log("DAI borrow", val));
getWBTCBorrowBalance().then((val) => console.log("WBTC own borrow", val));
getWBTCBorrowBalanceUSD().then((val) => console.log("WBTC own borrow USD", val));
getDAIAvgBorrowAPR().then((val) => console.log("DAI avg borrow APR", val));
getWBTCBorrowAPR().then((val) => console.log("WBTC borrow APR", val));
getWBTCNextBorrowAPR(ethers.utils.parseUnits("100", wbtcDecimals)).then((val) =>
  console.log("WBTC next borrow rate", val)
);

/// BORROW ///

async function borrowERC20(cTokenAddress, amount) {
  await morpho.borrow(cTokenAddress, amount);
}

async function borrowDAI(amount) {
  return borrowERC20(
    cDaiAddress, // the DAI market, represented by the cDAI ERC20 token
    amount
  );
  // signer now has _amount DAI: dai.balanceOf(signerAddress) == _amount
}

async function borrowETH(amount) {
  await borrowERC20(
    cEthAddress, // the WETH market, represented by the cETH ERC20 token
    amount
  );

  // signer now has _amount WETH: weth.balanceOf(signerAddress) == _amount
  return weth.withdraw(amount);
  // signer now has _amount ETH: signer.getBalance() == _amount
}

// borrowDAI(ethers.utils.parseUnits("100", daiDecimals));
// borrowETH(ethers.utils.parseEther(1));

/// REPAY ///

async function repayERC20(cTokenAddress, underlying, amount) {
  await underlying.approve(morpho.address, amount);
  await morpho.repay(
    cTokenAddress,
    signerAddress, // the address of the user you want to supply on behalf of
    amount
  );
}

async function repayDAI(amount) {
  return repayERC20(
    cDaiAddress, // the DAI market, represented by the cDAI ERC20 token
    dai,
    amount
  );
}

async function repayETH(amount) {
  // first wrap ETH into WETH
  await weth.deposit({ value: amount });

  return repayERC20(
    cEthAddress, // the WETH market, represented by the cETH ERC20 token
    weth,
    amount
  );
}

// repayDAI(ethers.utils.parseUnits(100, 18)); // DAI has 18 decimals
// repayETH(ethers.utils.parseEther(1));
