export type ContributionStatus = 'pending' | 'confirmed'

export interface AjoMember {
  address: string
  name: string
  savedAmount: number
  hasContributed: boolean
  hasReceived: boolean
  joinedAt: string
}

export interface AjoGroup {
  id: string
  name: string
  description: string
  contributionMode: 'fixed' | 'flexible'
  contributionAmount: number
  minContribution: number
  maxContribution: number
  cycleDays: number
  maxMembers: number
  members: AjoMember[]
  currentRound: number
  createdAt: string
  creatorAddress: string
  status: 'active' | 'completed' | 'pending'
  treasuryAddress: string
}

export interface Contribution {
  id: string
  groupId: string
  memberAddress: string
  amount: number
  round: number
  txHash?: string
  timestamp: string
  status: ContributionStatus
}

export interface Withdrawal {
  id: string
  groupId: string
  memberAddress: string
  amount: number
  round?: number
  type: 'payout' | 'vested'
  txHash?: string
  timestamp: string
}

export interface GroupActivity {
  contributions: Contribution[]
  withdrawals: Withdrawal[]
}