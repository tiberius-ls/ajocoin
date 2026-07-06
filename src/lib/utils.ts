import type { AjoGroup, AjoMember, Contribution, Withdrawal } from '../types'

export const CYCLE_PRESETS = [
  { label: 'Weekly', days: 7 },
  { label: 'Bi-weekly', days: 14 },
  { label: 'Monthly', days: 30 },
  { label: 'Quarterly', days: 90 },
] as const

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

export function formatCycleLabel(days: number): string {
  const preset = CYCLE_PRESETS.find(p => p.days === days)
  return preset ? preset.label : `Every ${days} days`
}

/** Backfill fields for groups created before flexible savings */
export function normalizeGroup(group: AjoGroup): AjoGroup {
  const amount = group.contributionAmount ?? 0
  const mode = group.contributionMode ?? 'fixed'
  const min = group.minContribution ?? amount
  const max = group.maxContribution ?? amount

  return {
    ...group,
    contributionMode: mode,
    minContribution: min,
    maxContribution: max,
    members: group.members.map(m => ({
      ...m,
      savedAmount: m.savedAmount ?? amount,
    })),
  }
}

export function isFlexibleGroup(group: AjoGroup): boolean {
  return (group.contributionMode ?? 'fixed') === 'flexible'
}

export function formatSavingsLabel(group: AjoGroup): string {
  const g = normalizeGroup(group)
  if (isFlexibleGroup(g)) {
    return `${formatNim(g.minContribution)} – ${formatNim(g.maxContribution)}`
  }
  return `${formatNim(g.contributionAmount)}/cycle`
}

export function getMemberAmount(group: AjoGroup, member: AjoMember): number {
  const g = normalizeGroup(group)
  return member.savedAmount ?? g.contributionAmount
}

export function validateMemberAmount(group: AjoGroup, amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return 'Enter a valid amount'
  const g = normalizeGroup(group)
  if (amount < g.minContribution) return `Minimum is ${formatNim(g.minContribution)}`
  if (amount > g.maxContribution) return `Maximum is ${formatNim(g.maxContribution)}`
  return null
}

function mergeMembers(a: AjoMember[], b: AjoMember[]): AjoMember[] {
  const map = new Map<string, AjoMember>()
  for (const m of [...a, ...b]) {
    const existing = map.get(m.address)
    if (!existing) {
      map.set(m.address, m)
      continue
    }
    map.set(m.address, {
      ...existing,
      name: m.name || existing.name,
      savedAmount: m.savedAmount ?? existing.savedAmount,
      hasContributed: existing.hasContributed || m.hasContributed,
      hasReceived: existing.hasReceived || m.hasReceived,
      joinedAt: existing.joinedAt < m.joinedAt ? existing.joinedAt : m.joinedAt,
    })
  }
  return Array.from(map.values())
}

/** Merge local and registry copies — registry wins on round/member count */
export function mergeTwoGroups(local: AjoGroup, registry: AjoGroup): AjoGroup {
  const l = normalizeGroup(local)
  const r = normalizeGroup(registry)
  const useRegistry =
    r.members.length > l.members.length ||
    r.currentRound > l.currentRound ||
    (r.members.length === l.members.length && r.status === 'completed')

  const base = useRegistry ? r : l
  return normalizeGroup({
    ...base,
    members: mergeMembers(r.members, l.members),
    currentRound: Math.max(l.currentRound, r.currentRound),
    status: l.status === 'completed' || r.status === 'completed' ? 'completed' : base.status,
  })
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

export function getRoundContributions(
  contributions: Contribution[],
  groupId: string,
  round: number
): Contribution[] {
  return contributions.filter(c => c.groupId === groupId && c.round === round)
}

export function getRoundPayout(
  group: AjoGroup,
  contributions: Contribution[],
  round: number
): number {
  const g = normalizeGroup(group)
  const roundContribs = getRoundContributions(contributions, g.id, round)
  if (roundContribs.length > 0) {
    return roundContribs.reduce((sum, c) => sum + c.amount, 0)
  }
  // Estimate before all contributions recorded
  return g.members.reduce((sum, m) => sum + getMemberAmount(g, m), 0)
}

/** @deprecated use getRoundPayout with contributions */
export function getPayoutAmount(group: AjoGroup): number {
  const g = normalizeGroup(group)
  return g.members.reduce((sum, m) => sum + getMemberAmount(g, m), 0)
}

export function getCurrentRecipient(group: AjoGroup): AjoGroup['members'][0] | null {
  const receivedCount = group.members.filter(m => m.hasReceived).length
  if (receivedCount >= group.members.length) return null
  return group.members[receivedCount] ?? null
}

export function getNextRecipient(group: AjoGroup): AjoGroup['members'][0] | null {
  const receivedCount = group.members.filter(m => m.hasReceived).length
  const nextIndex = receivedCount + 1
  if (nextIndex >= group.members.length) return null
  return group.members[nextIndex] ?? null
}

export function allMembersContributed(group: AjoGroup): boolean {
  return group.members.length > 0 && group.members.every(m => m.hasContributed)
}

export function isGroupCreator(group: AjoGroup, address: string | null): boolean {
  return !!address && group.creatorAddress === address
}

export function isTreasuryHolder(group: AjoGroup, address: string | null): boolean {
  return !!address && group.treasuryAddress === address
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