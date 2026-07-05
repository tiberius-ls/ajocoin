import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { AjoGroup, Vote, VestingSchedule, Contribution } from '../types'
import { loadState, saveState, seedDemoData } from '../lib/storage'
import { connectWallet, sendContribution, type WalletState } from '../lib/nimiq'
import { generateId } from '../lib/utils'

interface AjoContextValue {
  wallet: WalletState
  connecting: boolean
  connect: () => Promise<void>
  groups: AjoGroup[]
  votes: Vote[]
  vesting: VestingSchedule[]
  contributions: Contribution[]
  createGroup: (group: Omit<AjoGroup, 'id' | 'createdAt' | 'currentRound' | 'status' | 'members'>) => void
  joinGroup: (groupId: string, memberName: string) => void
  contribute: (groupId: string) => Promise<{ success: boolean; error?: string }>
  castVote: (voteId: string, optionIndex: number) => void
  createVote: (vote: Omit<Vote, 'id' | 'createdAt' | 'status' | 'options'> & { options: string[] }) => void
  releaseVesting: (vestingId: string, amount: number) => void
  loadDemo: () => void
}

const defaultWallet: WalletState = {
  status: 'disconnected',
  address: null,
  accounts: [],
  isNimiqPay: false,
  locale: 'en',
}

const AjoContext = createContext<AjoContextValue | null>(null)

export function AjoProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>(defaultWallet)
  const [connecting, setConnecting] = useState(false)
  const [groups, setGroups] = useState<AjoGroup[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [vesting, setVesting] = useState<VestingSchedule[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])

  useEffect(() => {
    const state = loadState()
    setGroups(state.groups)
    setVotes(state.votes)
    setVesting(state.vesting)
    setContributions(state.contributions)
  }, [])

  useEffect(() => {
    saveState({ groups, votes, vesting, contributions })
  }, [groups, votes, vesting, contributions])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      const result = await connectWallet()
      setWallet(result)
      if (result.address && groups.length === 0) {
        const demo = seedDemoData(result.address)
        setGroups(demo.groups)
        setVotes(demo.votes)
        setVesting(demo.vesting)
        setContributions(demo.contributions)
      }
    } finally {
      setConnecting(false)
    }
  }, [groups.length])

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

    setGroups(prev => [group, ...prev])
  }, [wallet.address])

  const joinGroup = useCallback((groupId: string, memberName: string) => {
    if (!wallet.address) return

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId || g.members.length >= g.maxMembers) return g
      if (g.members.some(m => m.address === wallet.address)) return g
      return {
        ...g,
        members: [...g.members, {
          address: wallet.address!,
          name: memberName,
          hasContributed: false,
          hasReceived: false,
          joinedAt: new Date().toISOString(),
        }],
      }
    }))
  }, [wallet.address])

  const contribute = useCallback(async (groupId: string) => {
    if (!wallet.address) return { success: false, error: 'Wallet not connected' }

    const group = groups.find(g => g.id === groupId)
    if (!group) return { success: false, error: 'Group not found' }

    const member = group.members.find(m => m.address === wallet.address)
    if (!member) return { success: false, error: 'You are not a member' }
    if (member.hasContributed) return { success: false, error: 'Already contributed this round' }

    const result = await sendContribution(group.treasuryAddress, group.contributionAmount)
    if (!result.success) return { success: false, error: result.error }

    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return {
        ...g,
        members: g.members.map(m =>
          m.address === wallet.address ? { ...m, hasContributed: true } : m
        ),
      }
    }))

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
    const vote: Vote = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      status: 'open',
      options: data.options.map(label => ({ label, votes: [] })),
    }
    setVotes(prev => [vote, ...prev])
  }, [])

  const releaseVesting = useCallback((vestingId: string, amount: number) => {
    setVesting(prev => prev.map(v => {
      if (v.id !== vestingId) return v
      const newReleased = Math.min(v.totalAmount, v.releasedAmount + amount)
      return { ...v, releasedAmount: newReleased }
    }))
  }, [])

  const loadDemo = useCallback(() => {
    const addr = wallet.address ?? 'NQ88 DEMO USER0 0000 0000 0000 0000 0000'
    const demo = seedDemoData(addr)
    setGroups(demo.groups)
    setVotes(demo.votes)
    setVesting(demo.vesting)
    setContributions(demo.contributions)
  }, [wallet.address])

  return (
    <AjoContext.Provider value={{
      wallet, connecting, connect, groups, votes, vesting, contributions,
      createGroup, joinGroup, contribute, castVote, createVote, releaseVesting, loadDemo,
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