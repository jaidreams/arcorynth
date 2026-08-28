# Arcorynth

**Stake. Grow. Arcorynth.** — A vUSDC staking dApp built on Arc Testnet.

Deposit vUSDC into the vault and earn demo rewards over time.

> ⚠️ **Testnet prototype only.** Use test vUSDC only; do not send real funds.

## Live demo

https://arcorynth.vercel.app/

## Contract explorer

https://testnet.arcscan.app/address/0xba6EC7597B5CC6353D2CB2c88AF6004063D96E4e

## Tech stack

- **Smart contract**: Solidity, deployed on Arc Testnet
- **Frontend**: React + Vite, ethers.js for on-chain interaction
- **Network**: Arc Testnet (Circle's stablecoin-native L1)

## Running locally

1. Clone the repo and install dependencies:

   ```
   git clone https://github.com/jaidreams/arcorynth.git
   cd arcorynth
   npm install
   ```

2. Start the dev server:

   ```
   npm run dev
   ```

3. Open the local URL shown in the terminal (typically `http://localhost:5173`)
   in a browser with the MetaMask extension installed.

4. Click **Connect Wallet** — Arc Testnet will be added/switched automatically.

## Contract addresses

Set in `src/contractConfig.js`:

- Staking contract: `0xba6EC7597B5CC6353D2CB2c88AF6004063D96E4e`
- vUSDC (Arc native token): `0x3600000000000000000000000000000000000000`

To point the frontend at a different deployment, update
`STAKING_CONTRACT_ADDRESS` in `src/contractConfig.js`.
