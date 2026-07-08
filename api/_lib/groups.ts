import type { AjoGroup, AjoMember } from './types.js'

function normalizeGroup(g: AjoGroup): AjoGroup {
  return {
    ...g,
    contributionMode: g.contributionMode ?? 'fixed',
    minContribution: g.minContribution ?? g.contributionAmount,
    maxContribution: g.maxContribution ?? g.contributionAmount,
  }
}

function mergeMembersUnion(a: AjoMember[], b: AjoMember[]): AjoMember[] {
  const map = new Map<string, AjoMember>()
  const primary = a.length > b.length ? a : b.length > a.length ? b : a
  const secondary = a.length > b.length ? b : b.length > a.length ? a : b

  for (const m of primary) map.set(m.address, m)
  for (const m of secondary) {
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

/** Newer snapshot wins member flags (used when a round advances and flags reset). */
function mergeMembersAuthoritative(older: AjoMember[], newer: AjoMember[]): AjoMember[] {
  const map = new Map<string, AjoMember>()
  for (const m of older) map.set(m.address, m)
  for (const m of newer) {
    const existing = map.get(m.address)
    map.set(m.address, existing
      ? {
          ...existing,
          ...m,
          name: m.name || existing.name,
          savedAmount: m.savedAmount ?? existing.savedAmount,
          joinedAt: existing.joinedAt < m.joinedAt ? existing.joinedAt : m.joinedAt,
        }
      : m)
  }
  return Array.from(map.values())
}

export function mergeTwoGroups(local: AjoGroup, registry: AjoGroup): AjoGroup {
  const l = normalizeGroup(local)
  const r = normalizeGroup(registry)

  if (r.currentRound > l.currentRound) {
    return normalizeGroup({
      ...r,
      members: mergeMembersAuthoritative(l.members, r.members),
    })
  }
  if (l.currentRound > r.currentRound) {
    return normalizeGroup({
      ...l,
      members: mergeMembersAuthoritative(r.members, l.members),
    })
  }

  const useRegistry =
    r.members.length > l.members.length ||
    (r.members.length === l.members.length && r.status === 'completed')

  const base = useRegistry ? r : l
  return normalizeGroup({
    ...base,
    members: mergeMembersUnion(l.members, r.members),
    currentRound: Math.max(l.currentRound, r.currentRound),
    status: l.status === 'completed' || r.status === 'completed' ? 'completed' : base.status,
  })
}