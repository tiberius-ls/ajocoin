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

  provider = await init({ timeout: 10000 })
  await provider.connect()

  const accountsResult = await provider.listAccounts()
  if (isErrorResponse(accountsResult)) {
    throw new Error(accountsResult.error.message)
  }

  const accounts = accountsResult as string[]
  const address = accounts[0] ?? null
  if (!address) throw new Error('No Nimiq account found')

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
    return { success: false, error: 'Wallet not connected' }
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

export function disconnectWallet(): void {
  provider?.disconnect()
  provider = null
}