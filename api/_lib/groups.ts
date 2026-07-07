import type { AjoGroup, AjoMember } from './types.js'

function normalizeGroup(g: AjoGroup): AjoGroup {
  return {
    ...g,
    contributionMode: g.contributionMode ?? 'fixed',
    minContribution: g.minContribution ?? g.contributionAmount,
    maxContribution: g.maxContribution ?? g.contributionAmount,
  }
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