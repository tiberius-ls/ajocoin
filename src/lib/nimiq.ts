import { init, getHostLanguage, type NimiqProvider } from '@nimiq/mini-app-sdk'
import type { ErrorResponse } from '@nimiq/mini-app-sdk'

export type WalletStatus = 'disconnected' | 'connecting' | 'connected' | 'demo'

export interface WalletState {
  status: WalletStatus
  address: string | null
  accounts: string[]
  isNimiqPay: boolean
  locale: string
}

const DEMO_ADDRESS = 'NQ88 DEMO USER0 0000 0000 0000 0000 0000'

let provider: NimiqProvider | null = null

function isErrorResponse(result: unknown): result is ErrorResponse {
  return typeof result === 'object' && result !== null && 'error' in result
}

export async function connectWallet(): Promise<WalletState> {
  const locale = getHostLanguage() ?? navigator.language.split('-')[0] ?? 'en'

  try {
    provider = await init({ timeout: 8000 })
    await provider.connect()

    const accountsResult = await provider.listAccounts()
    if (isErrorResponse(accountsResult)) {
      throw new Error(accountsResult.error.message)
    }

    const accounts = accountsResult as string[]
    return {
      status: 'connected',
      address: accounts[0] ?? null,
      accounts,
      isNimiqPay: true,
      locale,
    }
  } catch {
    return {
      status: 'demo',
      address: DEMO_ADDRESS,
      accounts: [DEMO_ADDRESS],
      isNimiqPay: false,
      locale,
    }
  }
}

export async function sendContribution(
  recipient: string,
  amountNim: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  if (!provider || !provider.connected) {
    return { success: true, txHash: `demo-${Date.now()}` }
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