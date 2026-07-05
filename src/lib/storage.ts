import type { AppState, AjoGroup, InvitePayload } from '../types'

const REGISTRY_KEY = 'ajocoin-registry'

const defaultState: AppState = {
  groups: [],
  votes: [],
  vesting: [],
  contributions: [],
  withdrawals: [],
}

function userKey(address: string): string {
  return `ajocoin-${address.replace(/\s/g, '')}`
}

export function loadState(address: string | null): AppState {
  if (!address) return { ...defaultState }
  try {
    const raw = localStorage.getItem(userKey(address))
    if (!raw) return { ...defaultState }
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return { ...defaultState }
  }
}

export function saveState(address: string, state: AppState): void {
  localStorage.setItem(userKey(address), JSON.stringify(state))
}

export function loadRegistry(): Record<string, AjoGroup> {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveRegistry(registry: Record<string, AjoGroup>): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry))
}

export function syncGroupToRegistry(group: AjoGroup): void {
  const registry = loadRegistry()
  registry[group.id] = group
  saveRegistry(registry)
}

export function getGroupFromRegistry(groupId: string): AjoGroup | null {
  return loadRegistry()[groupId] ?? null
}

export function buildInviteUrl(group: AjoGroup): string {
  const payload: InvitePayload = {
    id: group.id,
    name: group.name,
    description: group.description,
    contributionAmount: group.contributionAmount,
    cycleDays: group.cycleDays,
    maxMembers: group.maxMembers,
    creatorAddress: group.creatorAddress,
    treasuryAddress: group.treasuryAddress,
    createdAt: group.createdAt,
  }
  const encoded = btoa(JSON.stringify(payload))
  return `${window.location.origin}/join?invite=${encoded}`
}

export function parseInviteParam(invite: string): InvitePayload | null {
  try {
    const json = atob(invite)
    return JSON.parse(json) as InvitePayload
  } catch {
    return null
  }
}

export function inviteToGroup(payload: InvitePayload, members: AjoGroup['members'] = []): AjoGroup {
  return {
    ...payload,
    members,
    currentRound: 1,
    status: 'active',
  }
}

export function clearUserData(address: string): void {
  localStorage.removeItem(userKey(address))
}