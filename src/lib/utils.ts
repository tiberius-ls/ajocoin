import type { AjoGroup, Contribution, Withdrawal } from '../types'

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatNim(amount: number): string {
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} NIM`
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function vestingProgress(schedule: {
  startDate: string
  endDate: string
  releasedAmount: number
  totalAmount: number
}): number {
  const now = Date.now()
  const start = new Date(schedule.startDate).getTime()
  const end = new Date(schedule.endDate).getTime()

  if (now >= end) return 100
  if (now <= start) return Math.round((schedule.releasedAmount / schedule.totalAmount) * 100)

  const timeProgress = ((now - start) / (end - start)) * 100
  const amountProgress = (schedule.releasedAmount / schedule.totalAmount) * 100
  return Math.round(Math.max(timeProgress, amountProgress))
}

export function getTreasuryBalance(
  groupId: string,
  contributions: Contribution[],
  withdrawals: Withdrawal[]
): number {
  const contributed = contributions
    .filter(c => c.groupId === groupId)
    .reduce((sum, c) => sum + c.amount, 0)
  const withdrawn = withdrawals
    .filter(w => w.groupId === groupId)
    .reduce((sum, w) => sum + w.amount, 0)
  return Math.max(0, contributed - withdrawn)
}

export function getCurrentRecipient(group: AjoGroup): AjoGroup['members'][0] | null {
  const unpaid = group.members.filter(m => !m.hasReceived)
  if (unpaid.length === 0) return null
  const index = (group.currentRound - 1) % group.members.length
  return group.members[index] ?? unpaid[0]
}

export function allMembersContributed(group: AjoGroup): boolean {
  return group.members.length > 0 && group.members.every(m => m.hasContributed)
}

export function isGroupCreator(group: AjoGroup, address: string | null): boolean {
  return !!address && group.creatorAddress === address
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export async function shareLink(title: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: `Join my Ajo group: ${title}`, url })
      return 'shared'
    } catch {
      // user cancelled or unsupported
    }
  }
  const copied = await copyToClipboard(url)
  return copied ? 'copied' : 'failed'
}