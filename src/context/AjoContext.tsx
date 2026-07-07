import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { AjoGroup, Vote, VestingSchedule, Contribution, Withdrawal, TurnAlert } from '../types'
import {
  loadState, saveState, syncGroupToRegistry, getGroupFromRegistry,
  buildInviteUrl, parseInviteParam, inviteToGroup,
  removeGroupFromRegistry, loadGlobalAlerts, addGlobalAlert, markAlertRead,
  removeAlertsForGroup, getGroupActivity,
  removeGroupActivity, loadRegistry, resolveGroup,
  hydrateSharedStore, submitContributionToStore, submitWithdrawalToStore,
  retryConfirmContribution, startSharedStorePolling, stopSharedStorePolling,
  onSharedStoreUpdate, pullGroupFromServer,
} from '../lib/storage'
import { connectWallet, sendTransaction, disconnectWallet, type WalletState } from '../lib/nimiq'
import {
  generateId, getTreasuryBalance, getCurrentRecipient,
  allMembersContributed, vestingProgress, daysBetween, getRoundPayout,
  isTreasuryHolder, normalizeGroup, mergeTwoGroups, getMemberAmount, validateMemberAmount, formatNim,
} from '../lib/utils'

interface AjoContextValue {
  wallet: WalletState
  connecting: boolean
  connectError: string | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  myGroups: AjoGroup[]
  myAlerts: TurnAlert[]
  votes: Vote[]
  vesting: VestingSchedule[]
  contributions: Contribution[]
  withdrawals: Withdrawal[]
  createGroup: (
    group: Omit<AjoGroup, 'id' | 'createdAt' | 'currentRound' | 'status' | 'members'>,
    creatorSavedAmount?: number
  ) => { success: boolean; error?: string }
  addMember: (groupId: string, name: string, address: string, savedAmount?: number) => { success: boolean; error?: string }
  joinGroup: (groupId: string, memberName: string, savedAmount?: number) => { success: boolean; error?: string }
  joinFromInvite: (inviteParam: string, memberName: string, savedAmount?: number) => { success: boolean; error?: string }
  getInviteLink: (groupId: string) => string | null
  contribute: (groupId: string) => Promise<{ success: boolean; error?: string; pending?: boolean }>
  withdrawPayout: (groupId: string) => Promise<{ success: boolean; error?: string; nextRecipient?: string }>
  withdrawVested: (vestingId: string) => Promise<{ success: boolean; error?: string }>
  deleteGroup: (groupId: string) => { success: boolean; error?: string }
  dismissAlert: (alertId: string) => void
  castVote: (voteId: string, optionIndex: number) => void
  createVote: (vote: Omit<Vote, 'id' | 'createdAt' | 'status' | 'options'> & { options: string[] }) => void
  getGroup: (groupId: string) => AjoGroup | undefined
  getGroupContributions: (groupId: string) => Contribution[]
  getGroupWithdrawals: (groupId: string) => Withdrawal[]
  refreshGroup: (groupId: string) => Promise<void>
}

const defaultWallet: WalletState = {
  status: 'disconnected',
  address: null,
  accounts: [],
  isNimiqPay: false,
  locale: 'en',
}

const AjoContext = createContext<AjoContextValue | null>(null)

function persistGroup(group: AjoGroup, setGroups: React.Dispatch<React.SetStateAction<AjoGroup[]>>) {
  const normalized = normalizeGroup(group)
  syncGroupToRegistry(normalized)
  setGroups(prev => {
    const exists = prev.some(g => g.id === normalized.id)
    return exists ? prev.map(g => g.id === normalized.id ? normalized : g) : [...prev, normalized]
  })
}

function createTurnAlert(
  group: AjoGroup,
  recipient: AjoGroup['members'][0],
  type: TurnAlert['type'],
  round: number,
  message: string
): TurnAlert {
  return {
    id: generateId(),
    groupId: group.id,
    groupName: group.name,
    recipientAddress: recipient.address,
    recipientName: recipient.name,
    type,
    round,
    message,
    createdAt: new Date().toISOString(),
    read: false,
  }
}

export function AjoProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(defaultWallet)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [groups, setGroups] = useState<AjoGroup[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [vesting, setVesting] = useState<VestingSchedule[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [alerts, setAlerts] = useState<TurnAlert[]>([])

  const isConnected = wallet.status === 'connected' && !!wallet.address

  const myGroups = useMemo(() => {
    if (!wallet.address) return []
    return groups.filter(g => g.members.some(m => m.address === wallet.address))
  }, [groups, wallet.address])

  const myAlerts = useMemo(() => {
    if (!wallet.address) return []
    return alerts.filter(a => a.recipientAddress === wallet.address && !a.read)
  }, [alerts, wallet.address])

  const refreshAlerts = useCallback(() => {
    setAlerts(loadGlobalAlerts())
  }, [])

  const mergeGroupsFromRegistry = useCallback((userGroups: AjoGroup[], address: string) => {
    const registry = loadRegistry()
    const merged = new Map<string, AjoGroup>()
    userGroups.forEach(g => {
      const reg = registry[g.id]
      merged.set(g.id, reg ? mergeTwoGroups(g, reg) : normalizeGroup(g))
    })
    Object.values(registry).forEach(g => {
      if (!merged.has(g.id) && g.members.some(m => m.address === address)) {
        merged.set(g.id, normalizeGroup(g))
      }
    })
    return Array.from(merged.values())
  }, [])

  const refreshFromSharedStore = useCallback((address: string) => {
    setGroups(prev => mergeGroupsFromRegistry(prev, address))
  }, [mergeGroupsFromRegistry])

  const loadUserState = useCallback(async (address: string) => {
    const state = loadState(address)
    await hydrateSharedStore(address, state.groups.map(g => g.id))
    const mergedGroups = mergeGroupsFromRegistry(state.groups, address)
    setGroups(mergedGroups)
    setVotes(state.votes)
    setVesting(state.vesting)
    setContributions([])
    setWithdrawals([])
    setAlerts(loadGlobalAlerts())
  }, [mergeGroupsFromRegistry])

  const clearState = useCallback(() => {
    setGroups([])
    setVotes([])
    setVesting([])
    setContributions([])
    setWithdrawals([])
    setAlerts([])
  }, [])

  useEffect(() => {
    if (wallet.address) {
      saveState(wallet.address, { groups, votes, vesting, contributions, withdrawals, alerts })
    }
  }, [groups, votes, vesting, contributions, withdrawals, alerts, wallet.address])

  useEffect(() => {
    if (!wallet.address) {
      stopSharedStorePolling()
      return
    }

    const groupIds = groups.map(g => g.id)
    startSharedStorePolling(wallet.address, groupIds)
    const unsub = onSharedStoreUpdate(() => refreshFromSharedStore(wallet.address!))

    return () => {
      stopSharedStorePolling()
      unsub()
    }
  }, [wallet.address, groups.map(g => g.id).join(','), refreshFromSharedStore])

  const connect = useCallback(async () => {
    setConnecting(true)
    setConnectError(null)
    try {
      const result = await connectWallet()
      setWallet(result)
      if (result.address) loadUserState(result.address)
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Failed to connect wallet')
      setWallet(defaultWallet)
      clearState()
    } finally {
      setConnecting(false)
    }
  }, [loadUserState, clearState])

  const disconnect = useCallback(() => {
    disconnectWallet()
    setWallet(defaultWallet)
    setConnectError(null)
    clearState()
  }, [clearState])

  const getGroupContributions = useCallback((groupId: string) => {
    const global = getGroupActivity(groupId).contributions
    const local = contributions.filter(c => c.groupId === groupId)
    const map = new Map<string, Contribution>()
    global.forEach(c => map.set(c.id, c))
    local.forEach(c => map.set(c.id, c))
    return Array.from(map.values())
  }, [contributions])

  const getGroupWithdrawals = useCallback((groupId: string) => {
    const global = getGroupActivity(groupId).withdrawals
    const local = withdrawals.filter(w => w.groupId === groupId)
    const map = new Map<string, Withdrawal>()
    global.forEach(w => map.set(w.id, w))
    local.forEach(w => map.set(w.id, w))
    return Array.from(map.values())
  }, [withdrawals])

  const createGroup = useCallback((
    data: Omit<AjoGroup, 'id' | 'createdAt' | 'currentRound' | 'status' | 'members'>,
    creatorSavedAmount?: number
  ): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const creatorAmount = data.contributionMode === 'flexible'
      ? (creatorSavedAmount ?? data.contributionAmount)
      : data.contributionAmount

    const draftGroup = normalizeGroup({
      ...data,
      id: '',
      createdAt: '',
      currentRound: 1,
      status: 'active',
      members: [],
    } as AjoGroup)
    const amountError = validateMemberAmount(draftGroup, creatorAmount)
    if (amountError) return { success: false, error: amountError }

    const group: AjoGroup = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      currentRound: 1,
      status: 'active',
      members: [{
        address: wallet.address,
        name: 'You',
        savedAmount: creatorAmount,
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(group, setGroups)
    return { success: true }
  }, [wallet.address])

  const addMember = useCallback((
    groupId: string, name: string, address: string, savedAmount?: number
  ): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = resolveGroup(groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }
    if (group.creatorAddress !== wallet.address) return { success: false, error: 'Only the creator can add members' }
    if (group.members.length >= group.maxMembers) return { success: false, error: 'Group is full' }
    if (group.members.some(m => m.address === address.trim())) return { success: false, error: 'Member already exists' }
    if (!name.trim()) return { success: false, error: 'Name is required' }
    if (!address.trim()) return { success: false, error: 'Address is required' }

    const amount = savedAmount ?? group.contributionAmount
    if (!Number.isFinite(amount)) return { success: false, error: 'Enter a valid amount' }
    const amountError = validateMemberAmount(group, amount)
    if (amountError) return { success: false, error: amountError }

    const updated: AjoGroup = {
      ...group,
      members: [...group.members, {
        address: address.trim(),
        name: name.trim(),
        savedAmount: amount,
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(updated, setGroups)
    return { success: true }
  }, [wallet.address, groups])

  const joinGroup = useCallback((
    groupId: string, memberName: string, savedAmount?: number
  ): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }
    if (!memberName.trim()) return { success: false, error: 'Enter your display name' }

    const group = resolveGroup(groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }
    if (group.members.length >= group.maxMembers) return { success: false, error: 'Group is full' }
    if (group.members.some(m => m.address === wallet.address)) return { success: false, error: 'You are already a member' }

    const amount = savedAmount ?? group.contributionAmount
    if (!Number.isFinite(amount)) return { success: false, error: 'Enter a valid amount' }
    const amountError = validateMemberAmount(group, amount)
    if (amountError) return { success: false, error: amountError }

    const updated: AjoGroup = {
      ...group,
      members: [...group.members, {
        address: wallet.address,
        name: memberName.trim(),
        savedAmount: amount,
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(updated, setGroups)
    return { success: true }
  }, [wallet.address, groups])

  const joinFromInvite = useCallback((
    inviteParam: string, memberName: string, savedAmount?: number
  ): { success: boolean; error?: string } => {
    const payload = parseInviteParam(inviteParam)
    if (!payload) return { success: false, error: 'Invalid invite link' }

    void hydrateSharedStore(wallet.address ?? '', [payload.id])

    const existing = getGroupFromRegistry(payload.id)
    const group = existing ?? inviteToGroup(payload, [])
    if (!existing) syncGroupToRegistry(group)

    if (!groups.some(g => g.id === group.id)) {
      setGroups(prev => [...prev, group])
    }

    return joinGroup(group.id, memberName, savedAmount)
  }, [groups, joinGroup, wallet.address])

  const getInviteLink = useCallback((groupId: string): string | null => {
    const group = groups.find(g => g.id === groupId) ?? getGroupFromRegistry(groupId)
    if (!group) return null
    return buildInviteUrl(group)
  }, [groups])

  const contribute = useCallback(async (groupId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = resolveGroup(groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }

    const member = group.members.find(m => m.address === wallet.address)
    if (!member) return { success: false, error: 'You are not a member' }
    if (member.hasContributed) return { success: false, error: 'Already contributed this round' }

    const amount = getMemberAmount(group, member)
    const result = await sendTransaction(group.treasuryAddress, amount)
    if (!result.success) return { success: false, error: result.error }

    const contribution: Contribution = {
      id: generateId(),
      groupId,
      memberAddress: wallet.address,
      amount,
      round: group.currentRound,
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
      status: 'pending',
    }

    let saved: Contribution
    try {
      saved = await submitContributionToStore(contribution)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save contribution' }
    }

    setContributions(prev => [...prev, saved])

    if (saved.status === 'pending') {
      void retryConfirmContribution(saved.id, groupId).then(confirmed => {
        if (confirmed?.status === 'confirmed') {
          refreshFromSharedStore(wallet.address!)
        }
      })
      return { success: true, pending: true }
    }

    const updated: AjoGroup = {
      ...group,
      members: group.members.map(m =>
        m.address === wallet.address ? { ...m, hasContributed: true } : m
      ),
    }
    persistGroup(updated, setGroups)

    if (allMembersContributed(updated)) {
      const recipient = getCurrentRecipient(updated)
      if (recipient) {
        const allContribs = getGroupActivity(groupId).contributions
        const payout = getRoundPayout(updated, allContribs, updated.currentRound)

        addGlobalAlert(createTurnAlert(
          updated,
          recipient,
          'ready_to_withdraw',
          updated.currentRound,
          isTreasuryHolder(updated, recipient.address)
            ? `All members contributed! Release your ${payout} NIM payout from the treasury.`
            : `It's your turn! All members contributed — ${payout} NIM is ready for you once the treasurer releases it.`
        ))

        const treasurer = updated.members.find(m => m.address === updated.treasuryAddress)
        if (treasurer && treasurer.address !== recipient.address) {
          addGlobalAlert(createTurnAlert(
            updated,
            treasurer,
            'ready_to_withdraw',
            updated.currentRound,
            `All members contributed in round ${updated.currentRound}. Release ${payout} NIM to ${recipient.name}.`
          ))
        }

        refreshAlerts()
      }
    }

    return { success: true }
  }, [wallet.address, groups, refreshAlerts, refreshFromSharedStore])

  const withdrawPayout = useCallback(async (groupId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = resolveGroup(groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }
    if (!allMembersContributed(group)) return { success: false, error: 'Not all members have contributed yet' }

    const recipient = getCurrentRecipient(group)
    if (!recipient) return { success: false, error: 'No recipient for this round' }

    if (!isTreasuryHolder(group, wallet.address)) {
      if (recipient.address === wallet.address) {
        return { success: false, error: 'The treasurer must release your payout. You have been notified — they will send the funds from the group treasury.' }
      }
      return { success: false, error: 'Only the treasurer can release payouts' }
    }

    const groupContribs = getGroupContributions(groupId)
    const groupWithdraws = getGroupWithdrawals(groupId)
    const payoutAmount = getRoundPayout(group, groupContribs, group.currentRound)
    const balance = getTreasuryBalance(groupId, groupContribs, groupWithdraws)
    if (balance < payoutAmount) {
      return { success: false, error: `Insufficient treasury balance (${balance} NIM available, ${payoutAmount} NIM needed)` }
    }

    const result = await sendTransaction(recipient.address, payoutAmount)
    if (!result.success) return { success: false, error: result.error }

    const updatedMembers = group.members.map(m =>
      m.address === recipient.address
        ? { ...m, hasReceived: true, hasContributed: false }
        : { ...m, hasContributed: false }
    )

    const allReceived = updatedMembers.every(m => m.hasReceived)
    const updated: AjoGroup = {
      ...group,
      members: updatedMembers,
      currentRound: allReceived ? group.currentRound : group.currentRound + 1,
      status: allReceived ? 'completed' : 'active',
    }
    persistGroup(updated, setGroups)

    const withdrawal: Withdrawal = {
      id: generateId(),
      groupId,
      memberAddress: recipient.address,
      amount: payoutAmount,
      round: group.currentRound,
      type: 'payout',
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
    }
    try {
      await submitWithdrawalToStore(withdrawal)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save withdrawal' }
    }
    setWithdrawals(prev => [...prev, withdrawal])

    let nextRecipientName: string | undefined
    if (!allReceived) {
      const next = getCurrentRecipient(updated)
      if (next) nextRecipientName = next.name

      updated.members.forEach(member => {
        if (member.address === recipient.address) return
        const savingsHint = updated.contributionMode === 'flexible'
          ? formatNim(getMemberAmount(updated, member))
          : formatNim(updated.contributionAmount)

        if (next && member.address === next.address) {
          addGlobalAlert(createTurnAlert(
            updated,
            member,
            'up_next',
            updated.currentRound,
            `You're next in line for ${group.name}! Contribute in round ${updated.currentRound}, then you'll receive the payout.`
          ))
        }

        addGlobalAlert(createTurnAlert(
          updated,
          member,
          'contribute_now',
          updated.currentRound,
          `Round ${updated.currentRound} of ${group.name} has started. Please contribute ${savingsHint}.`
        ))
      })
      refreshAlerts()
    }

    return { success: true, nextRecipient: nextRecipientName }
  }, [wallet.address, groups, refreshAlerts, getGroupContributions, getGroupWithdrawals])

  const withdrawVested = useCallback(async (vestingId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const schedule = vesting.find(v => v.id === vestingId)
    if (!schedule) return { success: false, error: 'Schedule not found' }
    const group = resolveGroup(schedule.groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }

    const isOwner = schedule.memberAddress === wallet.address
    const isTreasurer = isTreasuryHolder(group, wallet.address)
    if (!isOwner && !isTreasurer) {
      return { success: false, error: 'Only the treasurer can release this vesting payout' }
    }

    const progress = vestingProgress(schedule)
    const totalDays = daysBetween(schedule.startDate, schedule.endDate)
    const cliffProgress = (schedule.cliffDays / totalDays) * 100
    if (progress < cliffProgress) return { success: false, error: 'Cliff period not reached yet' }

    const remaining = schedule.totalAmount - schedule.releasedAmount
    if (remaining <= 0) return { success: false, error: 'Nothing left to withdraw' }

    const chunk = Math.min(remaining, schedule.totalAmount * 0.25)

    if (!isTreasurer) {
      return { success: false, error: 'The treasurer must release vested funds to your wallet' }
    }

    const payee = schedule.memberAddress
    const result = await sendTransaction(payee, chunk)
    if (!result.success) return { success: false, error: result.error }

    setVesting(prev => prev.map(v =>
      v.id === vestingId ? { ...v, releasedAmount: v.releasedAmount + chunk } : v
    ))

    const withdrawal: Withdrawal = {
      id: generateId(),
      groupId: schedule.groupId,
      memberAddress: payee,
      amount: chunk,
      type: 'vested',
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
    }
    try {
      await submitWithdrawalToStore(withdrawal)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to save withdrawal' }
    }
    setWithdrawals(prev => [...prev, withdrawal])

    return { success: true }
  }, [wallet.address, vesting, groups])

  const deleteGroup = useCallback((groupId: string): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = resolveGroup(groupId, groups)
    if (!group) return { success: false, error: 'Group not found' }
    if (group.creatorAddress !== wallet.address) {
      return { success: false, error: 'Only the group creator can delete this group' }
    }

    setGroups(prev => prev.filter(g => g.id !== groupId))
    setVotes(prev => prev.filter(v => v.groupId !== groupId))
    setVesting(prev => prev.filter(v => v.groupId !== groupId))
    setContributions(prev => prev.filter(c => c.groupId !== groupId))
    setWithdrawals(prev => prev.filter(w => w.groupId !== groupId))

    removeGroupFromRegistry(groupId)
    removeAlertsForGroup(groupId)
    removeGroupActivity(groupId)
    refreshAlerts()

    return { success: true }
  }, [wallet.address, groups, refreshAlerts])

  const dismissAlert = useCallback((alertId: string) => {
    markAlertRead(alertId)
    refreshAlerts()
  }, [refreshAlerts])

  const castVote = useCallback((voteId: string, optionIndex: number) => {
    if (!wallet.address) return

    setVotes(prev => prev.map(v => {
      if (v.id !== voteId || v.status !== 'open') return v
      const alreadyVoted = v.options.some(o => o.votes.includes(wallet.address!))
      if (alreadyVoted) return v

      return {
        ...v,
        options: v.options.map((o, i) =>
          i === optionIndex ? { ...o, votes: [...o.votes, wallet.address!] } : o
        ),
      }
    }))
  }, [wallet.address])

  const createVote = useCallback((data: Omit<Vote, 'id' | 'createdAt' | 'status' | 'options'> & { options: string[] }) => {
    if (!wallet.address) return

    const vote: Vote = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: 'open',
      options: data.options.map(label => ({ label, votes: [] })),
    }
    setVotes(prev => [vote, ...prev])
  }, [wallet.address])

  const getGroup = useCallback((groupId: string) => {
    return resolveGroup(groupId, groups)
  }, [groups])

  const refreshGroup = useCallback(async (groupId: string) => {
    if (!wallet.address) return
    const remote = await pullGroupFromServer(groupId)
    if (remote) {
      setGroups(prev => {
        const exists = prev.some(g => g.id === groupId)
        return exists
          ? prev.map(g => g.id === groupId ? remote : g)
          : [...prev, remote]
      })
    } else {
      await hydrateSharedStore(wallet.address, [groupId])
      refreshFromSharedStore(wallet.address)
    }
  }, [wallet.address, refreshFromSharedStore])

  return (
    <AjoContext.Provider value={{
      wallet, connecting, connectError, connect, disconnect, isConnected,
      myGroups, myAlerts, votes, vesting, contributions, withdrawals,
      createGroup, addMember, joinGroup, joinFromInvite, getInviteLink,
      contribute, withdrawPayout, withdrawVested, deleteGroup, dismissAlert,
      castVote, createVote, getGroup, getGroupContributions, getGroupWithdrawals, refreshGroup,
    }}>
      {children}
    </AjoContext.Provider>
  )
}

export function useAjo() {
  const ctx = useContext(AjoContext)
  if (!ctx) throw new Error('useAjo must be used within AjoProvider')
  return ctx
}