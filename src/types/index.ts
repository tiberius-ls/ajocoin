export type ContributionMode = 'fixed' | 'flexible'

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
  contributionMode: ContributionMode
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

export interface VoteOption {
  label: string
  votes: string[]
}

export interface Vote {
  id: string
  groupId: string
  title: string
  description: string
  options: VoteOption[]
  createdAt: string
  status: 'open' | 'closed'
  createdBy: string
}

export interface VestingSchedule {
  id: string
  groupId: string
  groupName: string
  memberAddress: string
  memberName: string
  totalAmount: number
  releasedAmount: number
  startDate: string
  endDate: string
  cliffDays: number
}

export interface Contribution {
  id: string
  groupId: string
  memberAddress: string
  amount: number
  round: number
  txHash?: string
  timestamp: string
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

export type TurnAlertType = 'ready_to_withdraw' | 'up_next' | 'contribute_now'

export interface TurnAlert {
  id: string
  groupId: string
  groupName: string
  recipientAddress: string
  recipientName: string
  type: TurnAlertType
  round: number
  message: string
  createdAt: string
  read: boolean
}

export interface GroupActivity {
  contributions: Contribution[]
  withdrawals: Withdrawal[]
}

export interface AppState {
  groups: AjoGroup[]
  votes: Vote[]
  vesting: VestingSchedule[]
  contributions: Contribution[]
  withdrawals: Withdrawal[]
  alerts: TurnAlert[]
}

export interface InvitePayload {
  id: string
  name: string
  description: string
  contributionMode: ContributionMode
  contributionAmount: number
  minContribution: number
  maxContribution: number
  cycleDays: number
  maxMembers: number
  creatorAddress: string
  treasuryAddress: string
  createdAt: string
}