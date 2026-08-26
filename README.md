# Arc Stake — Frontend

Tumhare SimpleStaking contract ke liye website. MacBook pe chalane ke steps:

## 1. Terminal kholo, is folder mein jao

```
cd arc-stake
```

## 2. Dependencies install karo

```
npm install
```

## 3. Server chalu karo

```
npm run dev
```

Terminal mein ek local URL milega, kuch aisa: `http://localhost:5173`

## 4. Browser mein kholo

Us URL ko browser mein paste karo (jisme MetaMask extension installed hai).
"Connect Wallet" dabao — Arc Testnet apne aap add/switch ho jayega.

## Contract addresses (already set in src/contractConfig.js)

- Staking contract: `0x49410C2bfF72808ab7b0d792017B6a3310f7cDdc`
- vUSDC (Arc native): `0x3600000000000000000000000000000000000000`

Agar tum contract dobara deploy karo, sirf `src/contractConfig.js` mein
`STAKING_CONTRACT_ADDRESS` update karna.
