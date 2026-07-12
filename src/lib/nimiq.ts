import { init, getHostLanguage, type NimiqProvider } from '@nimiq/mini-app-sdk'
import type { ErrorResponse } from '@nimiq/mini-app-sdk'

export type WalletStatus = 'disconnected' | 'connecting' | 'connected'

export interface WalletState {
  status: WalletStatus
  address: string | null
  accounts: string[]
  isNimiqPay: boolean
  locale: string
}

let provider: NimiqProvider | null = null

function isErrorResponse(result: unknown): result is ErrorResponse {
  return typeof result === 'object' && result !== null && 'error' in result
}

export async function connectWallet(): Promise<WalletState> {
  const locale = getHostLanguage() ?? navigator.language.split('-')[0] ?? 'en'

  try {
    provider = await init({ timeout: 10000 })
  } catch {
    throw new Error('Unable to initialize the Nimiq provider. Open the app inside Nimiq Pay for wallet actions.')
  }

  try {
    await provider.connect()
  } catch {
    throw new Error('Wallet connection was cancelled or unavailable. Please retry inside Nimiq Pay.')
  }

  const accountsResult = await provider.listAccounts()
  if (isErrorResponse(accountsResult)) {
    throw new Error(accountsResult.error.message)
  }

  const accounts = accountsResult as string[]
  const address = accounts[0] ?? null
  if (!address) throw new Error('No Nimiq account found. Open the app in Nimiq Pay and allow account access.')

  return {
    status: 'connected',
    address,
    accounts,
    isNimiqPay: true,
    locale,
  }
}

export async function sendTransaction(
  recipient: string,
  amountNim: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!provider?.connected) {
    return { success: false, error: 'Wallet not connected. Open the app inside Nimiq Pay to send real transactions.' }
  }

  try {
    const result = await provider.sendBasicTransaction({
      recipient,
      value: Math.round(amountNim * 1e5),
    })

    if (isErrorResponse(result)) {
      return { success: false, error: result.error.message }
    }

    return { success: true, txHash: result as string }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Transaction failed' }
  }
}

export function getProvider(): NimiqProvider | null {
  return provider
}

const RPC_URL = 'https://rpc.nimiq.network'

export async function fetchWalletBalance(address: string): Promise<number | null> {
  const normalized = address.replace(/\s/g, '')

  try {
    const rpc = provider?.getRPC()
    if (rpc) {
      const luna = await rpc.call<number>({
        jsonrpc: '2.0',
        method: 'getBalance',
        params: [normalized],
      })
      if (typeof luna === 'number') return luna / 1e5
    }
  } catch {
    // Fall through to public RPC
  }

  try {
    const res = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'getBalance', params: [normalized], id: 1 }),
    })
    if (!res.ok) return null
    const json = await res.json() as { result?: number }
    if (typeof json.result === 'number') return json.result / 1e5
  } catch {
    return null
  }

  return null
}

export function disconnectWallet(): void {
  provider?.disconnect()
  provider = null
}