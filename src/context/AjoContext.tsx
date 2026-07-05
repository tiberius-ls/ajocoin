import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import type { AjoGroup, Vote, VestingSchedule, Contribution, Withdrawal } from '../types'
import {
  loadState, saveState, syncGroupToRegistry, getGroupFromRegistry,
  buildInviteUrl, parseInviteParam, inviteToGroup,
} from '../lib/storage'
import { connectWallet, sendTransaction, disconnectWallet, type WalletState } from '../lib/nimiq'
import {
  generateId, getTreasuryBalance, getCurrentRecipient, allMembersContributed,
  vestingProgress, daysBetween,
} from '../lib/utils'

interface AjoContextValue {
  wallet: WalletState
  connecting: boolean
  connectError: string | null
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  myGroups: AjoGroup[]
  votes: Vote[]
  vesting: VestingSchedule[]
  contributions: Contribution[]
  withdrawals: Withdrawal[]
  createGroup: (group: Omit<AjoGroup, 'id' | 'createdAt' | 'currentRound' | 'status' | 'members'>) => void
  addMember: (groupId: string, name: string, address: string) => { success: boolean; error?: string }
  joinGroup: (groupId: string, memberName: string) => { success: boolean; error?: string }
  joinFromInvite: (inviteParam: string, memberName: string) => { success: boolean; error?: string }
  getInviteLink: (groupId: string) => string | null
  contribute: (groupId: string) => Promise<{ success: boolean; error?: string }>
  withdrawPayout: (groupId: string) => Promise<{ success: boolean; error?: string }>
  withdrawVested: (vestingId: string) => Promise<{ success: boolean; error?: string }>
  castVote: (voteId: string, optionIndex: number) => void
  createVote: (vote: Omit<Vote, 'id' | 'createdAt' | 'status' | 'options'> & { options: string[] }) => void
  getGroup: (groupId: string) => AjoGroup | undefined
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
  syncGroupToRegistry(group)
  setGroups(prev => {
    const exists = prev.some(g => g.id === group.id)
    return exists ? prev.map(g => g.id === group.id ? group : g) : [...prev, group]
  })
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

  const isConnected = wallet.status === 'connected' && !!wallet.address

  const myGroups = useMemo(() => {
    if (!wallet.address) return []
    return groups.filter(g => g.members.some(m => m.address === wallet.address))
  }, [groups, wallet.address])

  const loadUserState = useCallback((address: string) => {
    const state = loadState(address)
    setGroups(state.groups)
    setVotes(state.votes)
    setVesting(state.vesting)
    setContributions(state.contributions)
    setWithdrawals(state.withdrawals ?? [])
    state.groups.forEach(syncGroupToRegistry)
  }, [])

  const clearState = useCallback(() => {
    setGroups([])
    setVotes([])
    setVesting([])
    setContributions([])
    setWithdrawals([])
  }, [])

  useEffect(() => {
    if (wallet.address) {
      saveState(wallet.address, { groups, votes, vesting, contributions, withdrawals })
    }
  }, [groups, votes, vesting, contributions, withdrawals, wallet.address])

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

  const createGroup = useCallback((data: Omit<AjoGroup, 'id' | 'createdAt' | 'currentRound' | 'status' | 'members'>) => {
    if (!wallet.address) return

    const group: AjoGroup = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      currentRound: 1,
      status: 'active',
      members: [{
        address: wallet.address,
        name: 'You',
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(group, setGroups)
  }, [wallet.address])

  const addMember = useCallback((groupId: string, name: string, address: string): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = groups.find(g => g.id === groupId) ?? getGroupFromRegistry(groupId)
    if (!group) return { success: false, error: 'Group not found' }
    if (group.creatorAddress !== wallet.address) return { success: false, error: 'Only the creator can add members' }
    if (group.members.length >= group.maxMembers) return { success: false, error: 'Group is full' }
    if (group.members.some(m => m.address === address)) return { success: false, error: 'Member already exists' }
    if (!name.trim()) return { success: false, error: 'Name is required' }
    if (!address.trim()) return { success: false, error: 'Address is required' }

    const updated: AjoGroup = {
      ...group,
      members: [...group.members, {
        address: address.trim(),
        name: name.trim(),
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(updated, setGroups)
    return { success: true }
  }, [wallet.address, groups])

  const joinGroup = useCallback((groupId: string, memberName: string): { success: boolean; error?: string } => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }
    if (!memberName.trim()) return { success: false, error: 'Enter your display name' }

    const group = groups.find(g => g.id === groupId) ?? getGroupFromRegistry(groupId)
    if (!group) return { success: false, error: 'Group not found' }
    if (group.members.length >= group.maxMembers) return { success: false, error: 'Group is full' }
    if (group.members.some(m => m.address === wallet.address)) return { success: false, error: 'You are already a member' }

    const updated: AjoGroup = {
      ...group,
      members: [...group.members, {
        address: wallet.address,
        name: memberName.trim(),
        hasContributed: false,
        hasReceived: false,
        joinedAt: new Date().toISOString(),
      }],
    }

    persistGroup(updated, setGroups)
    return { success: true }
  }, [wallet.address, groups])

  const joinFromInvite = useCallback((inviteParam: string, memberName: string): { success: boolean; error?: string } => {
    const payload = parseInviteParam(inviteParam)
    if (!payload) return { success: false, error: 'Invalid invite link' }

    const existing = getGroupFromRegistry(payload.id)
    const group = existing ?? inviteToGroup(payload, [])
    if (!existing) syncGroupToRegistry(group)

    if (!groups.some(g => g.id === group.id)) {
      setGroups(prev => [...prev, group])
    }

    return joinGroup(group.id, memberName)
  }, [groups, joinGroup])

  const getInviteLink = useCallback((groupId: string): string | null => {
    const group = groups.find(g => g.id === groupId) ?? getGroupFromRegistry(groupId)
    if (!group) return null
    return buildInviteUrl(group)
  }, [groups])

  const contribute = useCallback(async (groupId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = groups.find(g => g.id === groupId)
    if (!group) return { success: false, error: 'Group not found' }

    const member = group.members.find(m => m.address === wallet.address)
    if (!member) return { success: false, error: 'You are not a member' }
    if (member.hasContributed) return { success: false, error: 'Already contributed this round' }

    const result = await sendTransaction(group.treasuryAddress, group.contributionAmount)
    if (!result.success) return { success: false, error: result.error }

    const updated: AjoGroup = {
      ...group,
      members: group.members.map(m =>
        m.address === wallet.address ? { ...m, hasContributed: true } : m
      ),
    }
    persistGroup(updated, setGroups)

    setContributions(prev => [...prev, {
      id: generateId(),
      groupId,
      memberAddress: wallet.address!,
      amount: group.contributionAmount,
      round: group.currentRound,
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
    }])

    return { success: true }
  }, [wallet.address, groups])

  const withdrawPayout = useCallback(async (groupId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const group = groups.find(g => g.id === groupId)
    if (!group) return { success: false, error: 'Group not found' }
    if (!allMembersContributed(group)) return { success: false, error: 'Not all members have contributed yet' }

    const recipient = getCurrentRecipient(group)
    if (!recipient || recipient.address !== wallet.address) {
      return { success: false, error: 'It is not your turn to withdraw' }
    }

    const payoutAmount = group.contributionAmount * group.members.length
    const balance = getTreasuryBalance(groupId, contributions, withdrawals)
    if (balance < payoutAmount) {
      return { success: false, error: 'Insufficient treasury balance' }
    }

    const result = await sendTransaction(wallet.address, payoutAmount)
    if (!result.success) return { success: false, error: result.error }

    const updatedMembers = group.members.map(m =>
      m.address === wallet.address
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

    setWithdrawals(prev => [...prev, {
      id: generateId(),
      groupId,
      memberAddress: wallet.address!,
      amount: payoutAmount,
      round: group.currentRound,
      type: 'payout',
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
    }])

    const vestEnd = new Date(Date.now() + group.cycleDays * 24 * 60 * 60 * 1000).toISOString()
    setVesting(prev => [...prev, {
      id: generateId(),
      groupId,
      groupName: group.name,
      memberAddress: wallet.address!,
      memberName: recipient.name,
      totalAmount: payoutAmount,
      releasedAmount: 0,
      startDate: new Date().toISOString(),
      endDate: vestEnd,
      cliffDays: Math.max(1, Math.floor(group.cycleDays * 0.25)),
    }])

    return { success: true }
  }, [wallet.address, groups, contributions, withdrawals])

  const withdrawVested = useCallback(async (vestingId: string) => {
    if (!wallet.address) return { success: false, error: 'Connect your wallet first' }

    const schedule = vesting.find(v => v.id === vestingId)
    if (!schedule) return { success: false, error: 'Schedule not found' }
    if (schedule.memberAddress !== wallet.address) return { success: false, error: 'Not your vesting schedule' }

    const progress = vestingProgress(schedule)
    const totalDays = daysBetween(schedule.startDate, schedule.endDate)
    const cliffProgress = (schedule.cliffDays / totalDays) * 100
    if (progress < cliffProgress) return { success: false, error: 'Cliff period not reached yet' }

    const remaining = schedule.totalAmount - schedule.releasedAmount
    if (remaining <= 0) return { success: false, error: 'Nothing left to withdraw' }

    const chunk = Math.min(remaining, schedule.totalAmount * 0.25)
    const group = groups.find(g => g.id === schedule.groupId)
    if (!group) return { success: false, error: 'Group not found' }

    const result = await sendTransaction(wallet.address, chunk)
    if (!result.success) return { success: false, error: result.error }

    setVesting(prev => prev.map(v =>
      v.id === vestingId
        ? { ...v, releasedAmount: v.releasedAmount + chunk }
        : v
    ))

    setWithdrawals(prev => [...prev, {
      id: generateId(),
      groupId: schedule.groupId,
      memberAddress: wallet.address!,
      amount: chunk,
      type: 'vested',
      txHash: result.txHash,
      timestamp: new Date().toISOString(),
    }])

    return { success: true }
  }, [wallet.address, vesting, groups])

  const castVote = useCallback((voteId: string, optionIndex: number) => {
    if (!wallet.address) return

    setVotes(prev => prev.map(v => {
      if (v.id !== voteId || v.status !== 'open') return v
      const alreadyVoted = v.options.some(o => o.votes.includes(wallet.address!))
      if (alreadyVoted) return v

      return {
        ...v,
        options: v.options.map((o, i) =>
          i === optionIndex
            ? { ...o, votes: [...o.votes, wallet.address!] }
            : o
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
    return groups.find(g => g.id === groupId) ?? getGroupFromRegistry(groupId) ?? undefined
  }, [groups])

  return (
    <AjoContext.Provider value={{
      wallet, connecting, connectError, connect, disconnect, isConnected,
      myGroups, votes, vesting, contributions, withdrawals,
      createGroup, addMember, joinGroup, joinFromInvite, getInviteLink,
      contribute, withdrawPayout, withdrawVested,
      castVote, createVote, getGroup,
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