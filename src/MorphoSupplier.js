import dotenv from "dotenv";
import ethers from "ethers";

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

const weth = new ethers.Contract(
  "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  [
    "function deposit() external payable",
    "function withdraw(uint256) external",
    "function approve(address, uint256) external returns (bool)",
  ],
  signer
);

const dai = new ethers.Contract(
  "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  ["function approve(address, uint256) external returns (bool)"],
  signer
);

const lens = new ethers.Contract(
  "0x930f1b46e1D081Ec1524efD95752bE3eCe51EF67",
  [
    "function getTotalSupply() external view returns (uint256, uint256, uint256)",
    "function getTotalMarketSupply(address) external view returns (uint256, uint256)",
    "function getCurrentSupplyBalanceInOf(address, address) external view returns (uint256, uint256, uint256)",
    "function getAverageSupplyRatePerBlock(address) external view returns (uint256)",
    "function getCurrentUserSupplyRatePerBlock(address, address) external view returns (uint256)",
    "function getNextUserSupplyRatePerBlock(address, address, uint256) external view returns (uint256)",
  ],
  signer
);

const morpho = new ethers.Contract(
  "0x8888882f8f843896699869179fB6E4f7e3B58888",
  [
    "function supply(address, address, uint256) external",
    "function supply(address, address, uint256, uint256) external",
    "function withdraw(address, uint256) external",
  ],
  signer
);

const oracle = new ethers.Contract(
  "0x65c816077C29b557BEE980ae3cC2dCE80204A0C5",
  ["function getUnderlyingPrice(address) external view returns (uint256)"],
  signer
);

/// QUERY ///

async function getTotalSupplyUSD() {
  const [, , totalSupplyUSD] = await lens.getTotalSupply();

  return Number(ethers.utils.formatUnits(totalSupplyUSD, 18)); // USD amounts are always in 18 decimals
}

async function getTotalDAIMarketSupply() {
  const [suppliedP2P, suppliedOnPool] = await lens.getTotalMarketSupply(
    cDaiAddress // the DAI market, represented by the cDAI ERC20 token
  );

  return Number(ethers.utils.formatUnits(suppliedP2P.add(suppliedOnPool), daiDecimals));
}

async function getWBTCSupplyBalance() {
  const [suppliedOnPool, suppliedP2P] = await lens.getCurrentSupplyBalanceInOf(
    cWbtc2Address, // the WBTC market, represented by the cWBTC2 ERC20 token
    signerAddress // the address of the user you want to get the supply of
  );

  return Number(ethers.utils.formatUnits(suppliedP2P.add(suppliedOnPool), wbtcDecimals));
}

async function getWBTCSupplyBalanceUSD() {
  const totalMarketSupply = await getWBTCSupplyBalance();
  const oraclePrice = await oracle.getUnderlyingPrice(cWbtc2Address); // in (36 - nb decimals of WBTC = 28) decimals

  return totalMarketSupply * Number(ethers.utils.formatUnits(oraclePrice, 36 - wbtcDecimals));
}

const nbBlocksPerYear = 4 * 60 * 24 * 365.25;

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getDAIAvgSupplyAPR() {
  const avgSupplyRatePerBlock = await lens.getAverageSupplyRatePerBlock(
    cDaiAddress // the DAI market, represented by the cDAI ERC20 token
  );

  return (
    Number(ethers.utils.formatUnits(avgSupplyRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getWBTCSupplyAPR() {
  const supplyRatePerBlock = await lens.getCurrentUserSupplyRatePerBlock(
    cWbtc2Address, // the DAI market, represented by the cDAI ERC20 token
    signerAddress // the address of the user you want to get the supply rate of
  );

  return (
    Number(ethers.utils.formatUnits(supplyRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

// @note The supply rate experienced on a market is specific to each user,
// @note dependending on how their supply is matched peer-to-peer or supplied to the Compound pool.
async function getWBTCNextSupplyAPR(amount) {
  const supplyRatePerBlock = await lens.getNextUserSupplyRatePerBlock(
    cWbtc2Address, // the DAI market, represented by the cDAI ERC20 token
    signerAddress, // the address of the user you want to get the next supply rate of
    amount
  );

  return (
    Number(ethers.utils.formatUnits(supplyRatePerBlock, 18)) * // 18 decimals, whatever the market
    nbBlocksPerYear
  );
}

getTotalSupplyUSD().then((val) => console.log("Total supply USD", val));
getTotalDAIMarketSupply().then((val) => console.log("DAI supply", val));
getWBTCSupplyBalance().then((val) => console.log("WBTC own supply", val));
getWBTCSupplyBalanceUSD().then((val) => console.log("WBTC own supply USD", val));
getDAIAvgSupplyAPR().then((val) => console.log("DAI avg supply APR", val));
getWBTCSupplyAPR().then((val) => console.log("WBTC supply APR", val));
getWBTCNextSupplyAPR(ethers.utils.parseUnits("100", wbtcDecimals)).then((val) =>
  console.log("DAI next supply rate", val)
);

/// SUPPLY ///

async function supplyERC20(cTokenAddress, underlying, amount) {
  await underlying.approve(morpho.address, amount);
  await morpho.supply(
    cTokenAddress,
    signerAddress, // the address of the user you want to supply on behalf of
    amount
  );
}

async function supplyDAI(amount) {
  return supplyERC20(
    cDaiAddress, // the DAI market, represented by the cDAI ERC20 token
    dai,
    amount
  );
}

async function supplyETH(amount) {
  // first wrap ETH into WETH
  await weth.deposit({ value: amount });

  return supplyERC20(
    cEthAddress, // the WETH market, represented by the cETH ERC20 token
    weth,
    amount
  );
}

// supplyDAI(ethers.utils.parseUnits("100", daiDecimals));
// supplyETH(ethers.utils.parseEther(1));

/// WITHDRAW ///

async function withdrawERC20(cTokenAddress, amount) {
  await morpho.withdraw(cTokenAddress, amount);
}

async function withdrawDAI(amount) {
  return withdrawERC20(
    cDaiAddress, // the DAI market, represented by the cDAI ERC20 token
    amount
  );
  // signer now has _amount WETH: dai.balanceOf(signerAddress) == _amount
}

async function withdrawETH(amount) {
  await withdrawERC20(
    cEthAddress, // the WETH market, represented by the cETH ERC20 token
    amount
  );

  // signer now has _amount WETH: weth.balanceOf(signerAddress) == _amount
  return weth.withdraw(amount);
  // signer now has _amount ETH: signer.getBalance() == _amount
}

// withdrawDAI(ethers.utils.parseUnits(100, 18)); // DAI has 18 decimals
// withdrawETH(ethers.utils.parseEther(1));
