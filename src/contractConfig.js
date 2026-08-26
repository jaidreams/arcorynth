// ---- Arc Testnet network details ----
export const ARC_TESTNET = {
  chainId: '0x4CEF52', // 5042002 in hex
  chainName: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 6 },
  rpcUrls: ['https://rpc.testnet.arc.network'],
  blockExplorerUrls: ['https://testnet.arcscan.app'],
}

// ---- Your deployed contract addresses ----
// (Same values you used in Remix — swap these if you redeploy)
export const STAKING_CONTRACT_ADDRESS = '0xf36bC6Bc9fD0AEcc9Ee657351D2cC4C351ba5f59'
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000'

// ---- Minimal ABI: only the functions the UI needs ----
export const STAKING_ABI = [
  'function stake(uint256 amount) external',
  'function unstake(uint256 amount) external',
  'function claimReward() external',
  'function getPendingReward(address user) external view returns (uint256)',
  'function stakes(address) external view returns (uint256 amount, uint256 lastUpdateTime, uint256 rewardEarned)',
  'function rewardRatePerSecond() external view returns (uint256)',
]

export const USDC_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
]
