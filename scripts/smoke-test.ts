/**
 * Logic smoke tests — run: npx tsx scripts/smoke-test.ts
 */
import {
  normalizeGroup, validateMemberAmount, getCurrentRecipient, getNextRecipient,
  getRoundPayout, mergeTwoGroups, allMembersContributed, getMemberAmount,
} from '../src/lib/utils'
import type { AjoGroup } from '../src/types'

let passed = 0
let failed = 0

function assert(condition: boolean, name: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    console.error(`  ✗ ${name}`)
  }
}

const baseGroup: AjoGroup = {
  id: 'g1',
  name: 'Test',
  description: 'Test',
  contributionMode: 'fixed',
  contributionAmount: 50,
  minContribution: 50,
  maxContribution: 50,
  cycleDays: 30,
  maxMembers: 4,
  currentRound: 1,
  createdAt: new Date().toISOString(),
  creatorAddress: 'A',
  treasuryAddress: 'A',
  status: 'active',
  members: [
    { address: 'A', name: 'Alice', savedAmount: 50, hasContributed: true, hasReceived: false, joinedAt: '1' },
    { address: 'B', name: 'Bob', savedAmount: 50, hasContributed: true, hasReceived: false, joinedAt: '2' },
  ],
}

console.log('\nValidation')
assert(validateMemberAmount(baseGroup, NaN) !== null, 'rejects NaN')
assert(validateMemberAmount(baseGroup, 0) !== null, 'rejects zero')
assert(validateMemberAmount(baseGroup, 50) === null, 'accepts valid fixed amount')

const flexGroup = normalizeGroup({ ...baseGroup, contributionMode: 'flexible', minContribution: 10, maxContribution: 100 })
assert(validateMemberAmount(flexGroup, 5) !== null, 'rejects below min')
assert(validateMemberAmount(flexGroup, 150) !== null, 'rejects above max')
assert(validateMemberAmount(flexGroup, 75) === null, 'accepts within range')

console.log('\nRecipient rotation')
assert(getCurrentRecipient(baseGroup)?.address === 'A', 'first recipient is Alice')
const afterA = { ...baseGroup, members: baseGroup.members.map((m, i) => i === 0 ? { ...m, hasReceived: true } : m) }
assert(getCurrentRecipient(afterA)?.address === 'B', 'second recipient is Bob after Alice received')

console.log('\nPayout calculation')
const contribs = [
  { id: '1', groupId: 'g1', memberAddress: 'A', amount: 30, round: 1, timestamp: '' },
  { id: '2', groupId: 'g1', memberAddress: 'B', amount: 70, round: 1, timestamp: '' },
]
const flexMembers = normalizeGroup({
  ...flexGroup,
  members: [
    { address: 'A', name: 'A', savedAmount: 30, hasContributed: true, hasReceived: false, joinedAt: '1' },
    { address: 'B', name: 'B', savedAmount: 70, hasContributed: true, hasReceived: false, joinedAt: '2' },
  ],
})
assert(getRoundPayout(flexMembers, contribs, 1) === 100, 'flexible payout sums actual contributions')

console.log('\nRegistry merge')
const local = baseGroup
const registry = { ...baseGroup, members: [...baseGroup.members, { address: 'C', name: 'Carol', savedAmount: 50, hasContributed: false, hasReceived: false, joinedAt: '3' }] }
const merged = mergeTwoGroups(local, registry)
assert(merged.members.length === 3, 'merge keeps all members from registry')
assert(allMembersContributed(merged) === false, 'not all contributed after new member joins')

const joinMerge = mergeTwoGroups(
  { ...baseGroup, members: [{ address: 'A', name: 'Alice', savedAmount: 50, hasContributed: false, hasReceived: false, joinedAt: '1' }] },
  { ...baseGroup, members: [{ address: 'B', name: 'Bob', savedAmount: 50, hasContributed: false, hasReceived: false, joinedAt: '2' }] },
)
assert(joinMerge.members[0].address === 'A', 'join merge preserves creator order before new member')
assert(joinMerge.members[1].address === 'B', 'join merge appends new member after creator')

console.log('\nBackward compat')
const legacy = normalizeGroup({ ...baseGroup, contributionMode: undefined as unknown as 'fixed', members: [{ address: 'A', name: 'A', savedAmount: undefined as unknown as number, hasContributed: false, hasReceived: false, joinedAt: '1' }] })
assert(getMemberAmount(legacy, legacy.members[0]) === 50, 'legacy member gets group amount')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)