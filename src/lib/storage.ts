import type { AppState, AjoGroup, InvitePayload, TurnAlert, GroupActivity, Contribution, Withdrawal } from '../types'

const REGISTRY_KEY = 'ajocoin-registry'
const ALERTS_KEY = 'ajocoin-alerts'
const ACTIVITY_KEY = 'ajocoin-activity'

const defaultState: AppState = {
  groups: [],
  votes: [],
  vesting: [],
  contributions: [],
  withdrawals: [],
  alerts: [],
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

export function removeGroupFromRegistry(groupId: string): void {
  const registry = loadRegistry()
  delete registry[groupId]
  saveRegistry(registry)
}

export function getGroupFromRegistry(groupId: string): AjoGroup | null {
  return loadRegistry()[groupId] ?? null
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
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function saveGroupActivity(activity: Record<string, GroupActivity>): void {
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activity))
}

export function getGroupActivity(groupId: string): GroupActivity {
  const all = loadGroupActivity()
  return all[groupId] ?? { contributions: [], withdrawals: [] }
}

export function appendContribution(contribution: Contribution): void {
  const all = loadGroupActivity()
  const activity = all[contribution.groupId] ?? { contributions: [], withdrawals: [] }
  if (!activity.contributions.some(c => c.id === contribution.id)) {
    activity.contributions.push(contribution)
    all[contribution.groupId] = activity
    saveGroupActivity(all)
  }
}

export function appendWithdrawal(withdrawal: Withdrawal): void {
  const all = loadGroupActivity()
  const activity = all[withdrawal.groupId] ?? { contributions: [], withdrawals: [] }
  if (!activity.withdrawals.some(w => w.id === withdrawal.id)) {
    activity.withdrawals.push(withdrawal)
    all[withdrawal.groupId] = activity
    saveGroupActivity(all)
  }
}

export function removeGroupActivity(groupId: string): void {
  const all = loadGroupActivity()
  delete all[groupId]
  saveGroupActivity(all)
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