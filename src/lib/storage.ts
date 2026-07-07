import type { AppState, AjoGroup, InvitePayload, TurnAlert, GroupActivity, Contribution, Withdrawal } from '../types'
import { normalizeGroup, mergeTwoGroups } from './utils'
import {
  isServerStoreEnabled,
  fetchMemberGroups,
  fetchGroup,
  fetchGroupActivity,
  putGroupRemote,
  deleteGroupRemote,
  postContribution,
  postWithdrawal,
  confirmContribution,
} from './serverApi'

const ALERTS_KEY = 'ajocoin-alerts'

const defaultState: AppState = {
  groups: [],
  votes: [],
  vesting: [],
  contributions: [],
  withdrawals: [],
  alerts: [],
}

/** In-memory shared cache — source of truth is the server when configured. */
let registryCache: Record<string, AjoGroup> = {}
let activityCache: Record<string, GroupActivity> = {}

let syncListeners: Array<() => void> = []
let pollTimer: ReturnType<typeof setInterval> | null = null

function userKey(address: string): string {
  return `ajocoin-${address.replace(/\s/g, '')}`
}

function notifySyncListeners(): void {
  syncListeners.forEach(fn => fn())
}

export function onSharedStoreUpdate(listener: () => void): () => void {
  syncListeners.push(listener)
  return () => {
    syncListeners = syncListeners.filter(l => l !== listener)
  }
}

function setRegistryCache(registry: Record<string, AjoGroup>): void {
  registryCache = registry
}

function setActivityCache(groupId: string, activity: GroupActivity): void {
  activityCache[groupId] = activity
}

export function loadState(address: string | null): AppState {
  if (!address) return { ...defaultState }
  try {
    const raw = localStorage.getItem(userKey(address))
    if (!raw) return { ...defaultState }
    const parsed = JSON.parse(raw) as AppState
    return {
      ...defaultState,
      ...parsed,
      contributions: [],
      withdrawals: [],
    }
  } catch {
    return { ...defaultState }
  }
}

/** Persists wallet-local data only (votes, vesting, group membership refs, alerts). */
export function saveState(address: string, state: AppState): void {
  const localOnly: AppState = {
    ...state,
    contributions: [],
    withdrawals: [],
  }
  localStorage.setItem(userKey(address), JSON.stringify(localOnly))
}

export function loadRegistry(): Record<string, AjoGroup> {
  return { ...registryCache }
}

export function saveRegistry(_registry: Record<string, AjoGroup>): void {
  // No-op: registry is not persisted to localStorage.
}

export function syncGroupToRegistry(group: AjoGroup): void {
  const normalized = normalizeGroup(group)
  registryCache[group.id] = normalized
  if (isServerStoreEnabled()) {
    void putGroupRemote(normalized).then(remote => {
      if (remote) {
        registryCache[group.id] = normalizeGroup(remote)
        notifySyncListeners()
      }
    })
  }
}

export function removeGroupFromRegistry(groupId: string): void {
  delete registryCache[groupId]
  if (isServerStoreEnabled()) {
    void deleteGroupRemote(groupId)
  }
}

export function getGroupFromRegistry(groupId: string): AjoGroup | null {
  return registryCache[groupId] ?? null
}

export function resolveGroup(groupId: string, localGroups: AjoGroup[]): AjoGroup | undefined {
  const local = localGroups.find(g => g.id === groupId)
  const registry = getGroupFromRegistry(groupId)
  if (!local && !registry) return undefined
  if (!local) return normalizeGroup(registry!)
  if (!registry) return normalizeGroup(local)
  return mergeTwoGroups(local, registry)
}

export function loadGlobalAlerts(): TurnAlert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveGlobalAlerts(alerts: TurnAlert[]): void {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
}

export function addGlobalAlert(alert: TurnAlert): void {
  const alerts = loadGlobalAlerts()
  const exists = alerts.some(
    a => a.groupId === alert.groupId && a.recipientAddress === alert.recipientAddress
      && a.type === alert.type && a.round === alert.round && !a.read
  )
  if (!exists) {
    saveGlobalAlerts([alert, ...alerts])
  }
}

export function markAlertRead(alertId: string): void {
  const alerts = loadGlobalAlerts().map(a => a.id === alertId ? { ...a, read: true } : a)
  saveGlobalAlerts(alerts)
}

export function removeAlertsForGroup(groupId: string): void {
  saveGlobalAlerts(loadGlobalAlerts().filter(a => a.groupId !== groupId))
}

export function loadGroupActivity(): Record<string, GroupActivity> {
  return { ...activityCache }
}

export function saveGroupActivity(_activity: Record<string, GroupActivity>): void {
  // No-op: activity is not persisted to localStorage.
}

export function getGroupActivity(groupId: string): GroupActivity {
  return activityCache[groupId] ?? { contributions: [], withdrawals: [] }
}

export function appendContribution(contribution: Contribution): void {
  const activity = activityCache[contribution.groupId] ?? { contributions: [], withdrawals: [] }
  if (!activity.contributions.some(c => c.id === contribution.id)) {
    activity.contributions.push(contribution)
    activityCache[contribution.groupId] = activity
  }
}

export function appendWithdrawal(withdrawal: Withdrawal): void {
  const activity = activityCache[withdrawal.groupId] ?? { contributions: [], withdrawals: [] }
  if (!activity.withdrawals.some(w => w.id === withdrawal.id)) {
    activity.withdrawals.push(withdrawal)
    activityCache[withdrawal.groupId] = activity
  }
}

export function removeGroupActivity(groupId: string): void {
  delete activityCache[groupId]
}

/** Pull shared group + activity state from the server into in-memory cache. */
export async function hydrateSharedStore(
  address: string,
  knownGroupIds: string[] = []
): Promise<void> {
  if (!isServerStoreEnabled()) return

  try {
    const remoteGroups = await fetchMemberGroups(address)
    const idSet = new Set([...knownGroupIds, ...remoteGroups.map(g => g.id)])

    const registry: Record<string, AjoGroup> = { ...registryCache }
    for (const g of remoteGroups) {
      registry[g.id] = normalizeGroup(g)
    }

    await Promise.all([...idSet].map(async id => {
      if (!registry[id]) {
        const g = await fetchGroup(id)
        if (g) registry[id] = normalizeGroup(g)
      }
      const activity = await fetchGroupActivity(id)
      setActivityCache(id, activity)
    }))

    setRegistryCache(registry)
    notifySyncListeners()
  } catch {
    // Keep last in-memory cache on network failure.
  }
}

export async function submitContributionToStore(
  contribution: Contribution
): Promise<Contribution> {
  if (!isServerStoreEnabled()) {
    appendContribution({ ...contribution, status: 'confirmed' })
    return { ...contribution, status: 'confirmed' }
  }

  const { contribution: saved } = await postContribution(contribution)
  appendContribution(saved)
  notifySyncListeners()
  return saved
}

export async function submitWithdrawalToStore(
  withdrawal: Withdrawal
): Promise<Withdrawal> {
  if (!isServerStoreEnabled()) {
    appendWithdrawal(withdrawal)
    return withdrawal
  }

  const { withdrawal: saved } = await postWithdrawal(withdrawal)
  appendWithdrawal(saved)
  notifySyncListeners()
  return saved
}

export async function retryConfirmContribution(
  contributionId: string,
  groupId: string
): Promise<Contribution | null> {
  if (!isServerStoreEnabled()) return null
  const { contribution } = await confirmContribution(contributionId, groupId)
  appendContribution(contribution)
  const group = registryCache[groupId]
  if (group && contribution.status === 'confirmed') {
    registryCache[groupId] = {
      ...group,
      members: group.members.map(m =>
        m.address === contribution.memberAddress ? { ...m, hasContributed: true } : m
      ),
    }
  }
  notifySyncListeners()
  return contribution
}

export function startSharedStorePolling(address: string, groupIds: string[], intervalMs = 5000): void {
  stopSharedStorePolling()
  if (!isServerStoreEnabled() || !address) return

  pollTimer = setInterval(() => {
    void hydrateSharedStore(address, groupIds)
  }, intervalMs)
}

export function stopSharedStorePolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export function buildInviteUrl(group: AjoGroup): string {
  const payload: InvitePayload = {
    id: group.id,
    name: group.name,
    description: group.description,
    contributionMode: group.contributionMode ?? 'fixed',
    contributionAmount: group.contributionAmount,
    minContribution: group.minContribution ?? group.contributionAmount,
    maxContribution: group.maxContribution ?? group.contributionAmount,
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
    contributionMode: payload.contributionMode ?? 'fixed',
    minContribution: payload.minContribution ?? payload.contributionAmount,
    maxContribution: payload.maxContribution ?? payload.contributionAmount,
    members,
    currentRound: 1,
    status: 'active',
  }
}

export function clearUserData(address: string): void {
  localStorage.removeItem(userKey(address))
}