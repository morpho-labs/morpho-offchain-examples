# Morpho-Compound Off-Chain Examples

Learn how to interact with the Morpho-Compound protocol off-chain using a Smart Contract!

## Installation

This example repository uses `yarn` to manage dependencies.

```bash
git clone git@github.com:morpho-labs/morpho-offchain-examples.git
cd morpho-offchain-examples
yarn
```

## Usage

Copy-paste `.env.example`, name it `.env` and fill it with the values you want to use:

- `PRIVATE_KEY`: the private key of the hot wallet you want to use to supply/borrow through Morpho (:warning: never provide a program with the private key to your personal wallet!)
- `RPC_URL`: the RPC url to use to query data from the blockchain (you can get a free one with main RPC providers: Alchemy, Infura, ...)

```bash
cp .env.example .env
```

## Examples

### Morpho-Compound

- [MorphoSupplier.js](./src/compoud/MorphoSupplier.js): query supply-related data & supply through Morpho-Compound using ethers.js
- [MorphoBorrower.js](./src/compoud/MorphoBorrower.js): query borrow-related data & borrow through Morpho-Compound using ethers.js
- [MorphoRewardsTracker.js](./src/compoud/MorphoRewardsTracker.js): query rewards-related data using ethers.js

### Morpho-Aave V2

- [MorphoSupplier.js](./src/aave-v2/MorphoSupplier.js): query supply-related data & supply through Morpho-Aave V2 using ethers.js
- [MorphoBorrower.js](./src/aave-v2/MorphoBorrower.js): query borrow-related data & borrow through Morpho-Aave V2 using ethers.js
