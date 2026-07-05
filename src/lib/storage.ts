import type { AppState, AjoGroup, Vote, VestingSchedule, Contribution } from '../types'

const STORAGE_KEY = 'ajocoin-state'

const defaultState: AppState = {
  groups: [],
  votes: [],
  vesting: [],
  contributions: [],
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...defaultState }
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return { ...defaultState }
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function seedDemoData(creatorAddress: string): AppState {
  const groupId = 'demo-group-1'
  const now = new Date()
  const startDate = now.toISOString()
  const endDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const demoGroup: AjoGroup = {
    id: groupId,
    name: 'Lagos Tech Ajo',
    description: 'Monthly savings circle for tech professionals in Lagos',
    contributionAmount: 50,
    cycleDays: 30,
    maxMembers: 6,
    currentRound: 2,
    createdAt: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    creatorAddress,
    status: 'active',
    treasuryAddress: 'NQ07 DEMO TREA SURY0 0000 0000 0000 0000',
    members: [
      { address: creatorAddress, name: 'You', hasContributed: true, hasReceived: false, joinedAt: startDate },
      { address: 'NQ12 ALICE 0000 0000 0000 0000 0000', name: 'Ada', hasContributed: true, hasReceived: true, joinedAt: startDate },
      { address: 'NQ34 BOB00 0000 0000 0000 0000 0000', name: 'Chidi', hasContributed: false, hasReceived: false, joinedAt: startDate },
      { address: 'NQ56 CAROL 0000 0000 0000 0000 0000', name: 'Funke', hasContributed: true, hasReceived: false, joinedAt: startDate },
    ],
  }

  const demoVotes: Vote[] = [
    {
      id: 'vote-1',
      groupId,
      title: 'Add new member: Emeka',
      description: 'Emeka Okafor wants to join our savings circle. He was referred by Ada.',
      options: [
        { label: 'Approve', votes: [creatorAddress, 'NQ12 ALICE 0000 0000 0000 0000 0000'] },
        { label: 'Reject', votes: [] },
      ],
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open',
      createdBy: 'NQ12 ALICE 0000 0000 0000 0000 0000',
    },
    {
      id: 'vote-2',
      groupId,
      title: 'Skip Round 3 for Chidi',
      description: 'Chidi requested a one-cycle deferral due to emergency expenses.',
      options: [
        { label: 'Allow skip', votes: ['NQ12 ALICE 0000 0000 0000 0000 0000'] },
        { label: 'Deny skip', votes: [] },
      ],
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open',
      createdBy: creatorAddress,
    },
  ]

  const demoVesting: VestingSchedule[] = [
    {
      id: 'vest-1',
      groupId,
      groupName: 'Lagos Tech Ajo',
      memberAddress: 'NQ12 ALICE 0000 0000 0000 0000 0000',
      memberName: 'Ada',
      totalAmount: 250,
      releasedAmount: 125,
      startDate,
      endDate,
      cliffDays: 14,
    },
    {
      id: 'vest-2',
      groupId,
      groupName: 'Lagos Tech Ajo',
      memberAddress: creatorAddress,
      memberName: 'You',
      totalAmount: 200,
      releasedAmount: 50,
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000).toISOString(),
      cliffDays: 30,
    },
  ]

  const demoContributions: Contribution[] = [
    { id: 'c1', groupId, memberAddress: creatorAddress, amount: 50, round: 1, timestamp: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'c2', groupId, memberAddress: 'NQ12 ALICE 0000 0000 0000 0000 0000', amount: 50, round: 1, timestamp: new Date(now.getTime() - 44 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'c3', groupId, memberAddress: creatorAddress, amount: 50, round: 2, txHash: 'demo-tx-hash', timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString() },
  ]

  return {
    groups: [demoGroup],
    votes: demoVotes,
    vesting: demoVesting,
    contributions: demoContributions,
  }
}