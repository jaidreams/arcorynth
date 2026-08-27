import { useState, useEffect, useCallback, useRef } from 'react'
import { BrowserProvider, Contract, formatUnits, parseUnits } from 'ethers'
import {
  ARC_TESTNET,
  STAKING_CONTRACT_ADDRESS,
  USDC_ADDRESS,
  STAKING_ABI,
  USDC_ABI,
} from './contractConfig'

const USDC_DECIMALS = 6

function shortAddr(addr) {
  return addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : ''
}

export default function App() {
  const [theme, setTheme] = useState('dark')
  const [walletMenuOpen, setWalletMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const [account, setAccount] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('') // inline status/toast message

  const [walletBalance, setWalletBalance] = useState('0')
  const [stakedAmount, setStakedAmount] = useState('0')
  const [pendingReward, setPendingReward] = useState(0) // number, for live ticking
  const [rewardRate, setRewardRate] = useState(0)

  const [stakeInput, setStakeInput] = useState('')
  const [unstakeInput, setUnstakeInput] = useState('')
  const [busy, setBusy] = useState(false) // disables buttons during a tx

  const providerRef = useRef(null)

  // ---------- Theme ----------
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  }

  // ---------- Disconnect ----------
  // Note: MetaMask doesn't let a website force a full disconnect —
  // this clears the app's local session so you'd need "Connect Wallet" again.
  const disconnectWallet = () => {
    setAccount(null)
    providerRef.current = null
    setWalletBalance('0')
    setStakedAmount('0')
    setPendingReward(0)
    setWalletMenuOpen(false)
  }

  // ---------- Connect wallet ----------
  const connectWallet = useCallback(async () => {
    setError('')
    if (!window.ethereum) {
      setError('MetaMask not found. Please install the MetaMask extension.')
      return
    }
    try {
      setConnecting(true)
      const provider = new BrowserProvider(window.ethereum)
      providerRef.current = provider

      // Make sure we're on Arc Testnet — add it if the wallet doesn't know it yet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: ARC_TESTNET.chainId }],
        })
      } catch (switchErr) {
        if (switchErr.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARC_TESTNET],
          })
        } else {
          throw switchErr
        }
      }

      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not connect wallet.')
    } finally {
      setConnecting(false)
    }
  }, [])

  // ---------- Read on-chain data ----------
  const refreshData = useCallback(async () => {
    if (!account || !providerRef.current) return
    try {
      const provider = providerRef.current
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, provider)
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, provider)

      const [bal, stakeInfo, pending, rate] = await Promise.all([
        usdc.balanceOf(account),
        staking.stakes(account),
        staking.getPendingReward(account),
        staking.rewardRatePerSecond(),
      ])

      setWalletBalance(formatUnits(bal, USDC_DECIMALS))
      setStakedAmount(formatUnits(stakeInfo.amount, USDC_DECIMALS))
      setPendingReward(Number(formatUnits(pending, USDC_DECIMALS)))
      setRewardRate(Number(rate))
    } catch (e) {
      console.error('refreshData error', e)
    }
  }, [account])

  useEffect(() => {
    if (account) refreshData()
  }, [account, refreshData])

  // Re-sync with the chain every 20s
  useEffect(() => {
    if (!account) return
    const id = setInterval(refreshData, 20000)
    return () => clearInterval(id)
  }, [account, refreshData])

  // Live-tick the pending reward every second between chain refreshes —
  // this is a client-side estimate, purely visual, resynced on refreshData()
  useEffect(() => {
    if (!account || Number(stakedAmount) <= 0) return
    const id = setInterval(() => {
      const staked = Number(stakedAmount)
      const perSecond = (staked * rewardRate) / 1e18
      setPendingReward((prev) => prev + perSecond)
    }, 1000)
    return () => clearInterval(id)
  }, [account, stakedAmount, rewardRate])

  // ---------- Actions ----------
  const handleStake = async () => {
    if (!stakeInput || Number(stakeInput) <= 0) return
    setBusy(true)
    setStatus('Requesting approval…')
    try {
      const signer = await providerRef.current.getSigner()
      const usdc = new Contract(USDC_ADDRESS, USDC_ABI, signer)
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer)
      const amount = parseUnits(stakeInput, USDC_DECIMALS)

      const approveTx = await usdc.approve(STAKING_CONTRACT_ADDRESS, amount)
      await approveTx.wait()

      setStatus('Staking…')
      const stakeTx = await staking.stake(amount)
      await stakeTx.wait()

      setStatus('Staked successfully.')
      setStakeInput('')
      await refreshData()
    } catch (e) {
      console.error(e)
      setStatus('')
      setError(e.shortMessage || e.message || 'Stake failed.')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 4000)
    }
  }

  const handleUnstake = async () => {
    if (!unstakeInput || Number(unstakeInput) <= 0) return
    setBusy(true)
    setStatus('Unstaking…')
    try {
      const signer = await providerRef.current.getSigner()
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer)
      const amount = parseUnits(unstakeInput, USDC_DECIMALS)
      const tx = await staking.unstake(amount)
      await tx.wait()
      setStatus('Unstaked successfully.')
      setUnstakeInput('')
      await refreshData()
    } catch (e) {
      console.error(e)
      setStatus('')
      setError(e.shortMessage || e.message || 'Unstake failed.')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 4000)
    }
  }

  const handleClaim = async () => {
    setBusy(true)
    setStatus('Claiming reward…')
    try {
      const signer = await providerRef.current.getSigner()
      const staking = new Contract(STAKING_CONTRACT_ADDRESS, STAKING_ABI, signer)
      const tx = await staking.claimReward()
      await tx.wait()
      setStatus('Reward claimed.')
      await refreshData()
    } catch (e) {
      console.error(e)
      setStatus('')
      setError(e.shortMessage || e.message || 'Claim failed.')
    } finally {
      setBusy(false)
      setTimeout(() => setStatus(''), 4000)
    }
  }

  return (
    <div className="page">
      <div className="arc-glow" aria-hidden="true" />
      <div className="grid-veil" aria-hidden="true" />

      <header className="nav">
        <div className="brand">
          <span className="brand-mark">⌒</span>
          <span className="brand-name">Arcorynth</span>
        </div>
        <div className="nav-right">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>

          {account ? (
            <div className="wallet-menu">
              <button
                className="wallet-pill"
                onClick={(e) => {
                  e.stopPropagation()
                  setWalletMenuOpen((o) => !o)
                }}
              >
                <span className="dot" />
                {shortAddr(account)}
              </button>
              {walletMenuOpen && (
                <div className="wallet-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      const fallbackCopy = () => {
                        const el = document.createElement('textarea')
                        el.value = account
                        el.style.position = 'fixed'
                        el.style.opacity = '0'
                        document.body.appendChild(el)
                        el.focus()
                        el.select()
                        try {
                          document.execCommand('copy')
                        } catch (err) {
                          console.error(err)
                        }
                        document.body.removeChild(el)
                      }

                      if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(account).catch(fallbackCopy)
                      } else {
                        fallbackCopy()
                      }
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    }}
                  >
                    {copied ? 'Copied ✓' : 'Copy address'}
                  </button>
                  <a
                    className="dropdown-link"
                    href={`https://testnet.arcscan.app/address/${account}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setWalletMenuOpen(false)}
                  >
                    View on ArcScan
                  </a>
                  <button
                    className="disconnect"
                    onClick={() => {
                      disconnectWallet()
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button className="btn btn-ghost" onClick={connectWallet} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </header>

      <main className="hero">
        <p className="eyebrow">Stake. Grow. Arcorynth. · Arc Testnet</p>
        <h1>
          Stake vUSDC.
          <br />
          Watch it grow.
        </h1>
        <p className="subhead">
          Deposit vUSDC into the vault and earn continuous yield, second by second,
          settled directly on Arc.
        </p>

        {!account ? (
          <button className="btn btn-primary btn-lg" onClick={connectWallet} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect Wallet to Begin'}
          </button>
        ) : (
          <div className="panel">
            <div className="stat-row">
              <div className="stat">
                <span className="stat-label">Staked</span>
                <span className="stat-value mono">{Number(stakedAmount).toFixed(4)}</span>
                <span className="stat-unit">vUSDC</span>
              </div>
              <div className="stat stat-accent">
                <span className="stat-label">Earned reward</span>
                <span className="stat-value mono glow-text">{pendingReward.toFixed(8)}</span>
                <span className="stat-unit">vUSDC</span>
              </div>
              <div className="stat">
                <span className="stat-label">Wallet balance</span>
                <span className="stat-value mono">{Number(walletBalance).toFixed(4)}</span>
                <span className="stat-unit">vUSDC</span>
              </div>
            </div>

            <div className="divider" />

            <div className="action-grid">
              <div className="action">
                <label>Stake amount</label>
                <div className="input-row">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    value={stakeInput}
                    onChange={(e) => setStakeInput(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    className="max-btn"
                    onClick={() => setStakeInput(walletBalance)}
                    disabled={busy}
                  >
                    Max
                  </button>
                </div>
                <button className="btn btn-primary" onClick={handleStake} disabled={busy}>
                  Stake
                </button>
              </div>

              <div className="action">
                <label>Unstake amount</label>
                <div className="input-row">
                  <input
                    type="number"
                    min="0"
                    placeholder="0.0"
                    value={unstakeInput}
                    onChange={(e) => setUnstakeInput(e.target.value)}
                    disabled={busy}
                  />
                  <button
                    className="max-btn"
                    onClick={() => setUnstakeInput(stakedAmount)}
                    disabled={busy}
                  >
                    Max
                  </button>
                </div>
                <button className="btn btn-secondary" onClick={handleUnstake} disabled={busy}>
                  Unstake
                </button>
              </div>
            </div>

            <button className="btn btn-claim" onClick={handleClaim} disabled={busy}>
              Claim reward
            </button>

            {status && <p className="status-line">{status}</p>}
            {error && <p className="error-line">{error}</p>}
          </div>
        )}

        {!account && status && <p className="status-line">{status}</p>}
        {!account && error && <p className="error-line">{error}</p>}
      </main>

      <footer className="footer">
        <a
          href={`https://testnet.arcscan.app/address/${STAKING_CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          View contract on ArcScan
        </a>
        <span className="footer-sep">·</span>
        <span>Arc Network Testnet</span>
      </footer>
    </div>
  )
}
