/**
 * E2E test for withdraw + turn alerts on live Vercel deploy.
 * Run: npx playwright install chromium && node scripts/e2e-vercel.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.AJOCOIN_URL || 'https://ajocoin.vercel.app'
const TREASURER = 'NQ07 TREAS URER0 0000 0000 0000 0000'
const MEMBER_B = 'NQ12 MEMB ER01 0000 0000 0000 0000'
const GROUP_ID = 'e2e-test-group'
const userKey = (addr) => `ajocoin-${addr.replace(/\s/g, '')}`

function buildTestState() {
  const group = {
    id: GROUP_ID,
    name: 'E2E Test Ajo',
    description: 'Automated withdraw test',
    contributionMode: 'fixed',
    contributionAmount: 50,
    minContribution: 50,
    maxContribution: 50,
    cycleDays: 30,
    maxMembers: 4,
    members: [
      { address: TREASURER, name: 'Treasurer', savedAmount: 50, hasContributed: true, hasReceived: false, joinedAt: new Date().toISOString() },
      { address: MEMBER_B, name: 'Bob', savedAmount: 50, hasContributed: true, hasReceived: false, joinedAt: new Date().toISOString() },
    ],
    currentRound: 1,
    createdAt: new Date().toISOString(),
    creatorAddress: TREASURER,
    status: 'active',
    treasuryAddress: TREASURER,
  }

  const contributions = [
    { id: 'c1', groupId: GROUP_ID, memberAddress: TREASURER, amount: 50, round: 1, txHash: 'e2e-c1', timestamp: new Date().toISOString() },
    { id: 'c2', groupId: GROUP_ID, memberAddress: MEMBER_B, amount: 50, round: 1, txHash: 'e2e-c2', timestamp: new Date().toISOString() },
  ]

  const alerts = [
    {
      id: 'alert-withdraw-1',
      groupId: GROUP_ID,
      groupName: group.name,
      recipientAddress: TREASURER,
      recipientName: 'Treasurer',
      type: 'ready_to_withdraw',
      round: 1,
      message: 'All members contributed! Release your 100 NIM payout from the treasury.',
      createdAt: new Date().toISOString(),
      read: false,
    },
  ]

  return {
    userState: { groups: [group], votes: [], vesting: [], contributions, withdrawals: [], alerts: [] },
    registry: { [GROUP_ID]: group },
    activity: { [GROUP_ID]: { contributions, withdrawals: [] } },
    alerts,
  }
}

const mockNimiqScript = (address) => `
  window.nimiqPay = { language: 'en' };
  window.nimiq = {
    connected: false,
    async connect() { this.connected = true; },
    disconnect() { this.connected = false; },
    async listAccounts() { return ['${address}']; },
    async sendBasicTransaction(tx) {
      return 'e2e-tx-' + Date.now();
    },
  };
`

async function seedStorage(page, state) {
  const key = userKey(TREASURER)
  await page.evaluate(({ key, state, userKeyTreasurer }) => {
    localStorage.setItem(key, JSON.stringify(state.userState))
    localStorage.setItem('ajocoin-registry', JSON.stringify(state.registry))
    localStorage.setItem('ajocoin-activity', JSON.stringify(state.activity))
    localStorage.setItem('ajocoin-alerts', JSON.stringify(state.alerts))
  }, { key, state, userKeyTreasurer: key })
}

function log(step, ok, detail = '') {
  const icon = ok ? '✓' : '✗'
  console.log(`${icon} ${step}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  const state = buildTestState()
  let passed = 0
  let failed = 0
  const check = (name, ok, detail) => {
    log(name, ok, detail)
    ok ? passed++ : failed++
    return ok
  }

  console.log(`\nTesting ${BASE}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.addInitScript(mockNimiqScript(TREASURER))
  await page.goto(BASE, { waitUntil: 'networkidle' })

  // Connect wallet
  const connectBtn = page.getByRole('button', { name: /connect/i }).first()
  await connectBtn.click()
  await page.waitForTimeout(1500)

  const connected = await page.getByText(/NQ07/i).first().isVisible().catch(() => false)
  check('Wallet connects with mock Nimiq', connected)

  // Seed state after first load (wallet address known)
  await seedStorage(page, state)
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /connect/i }).first().click()
  await page.waitForTimeout(1500)

  // Test 1: Turn alert visible
  const alertVisible = await page.getByText(/your turn to withdraw/i).isVisible().catch(() => false)
  check('Turn alert shows "Your turn to withdraw"', alertVisible)

  const alertMessage = await page.getByText(/release your 100 nim payout/i).isVisible().catch(() => false)
  check('Alert mentions 100 NIM payout', alertMessage)

  // Navigate to group via alert link
  if (alertVisible) {
    await page.getByText(/view e2e test ajo/i).click()
    await page.waitForTimeout(800)
  } else {
    await page.goto(`${BASE}/group/${GROUP_ID}`)
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: /connect/i }).first().click().catch(() => {})
    await page.waitForTimeout(1000)
  }

  // Test 2: Release payout button
  const releaseBtn = page.getByRole('button', { name: /release 100 nim to treasurer/i })
  const releaseVisible = await releaseBtn.isVisible().catch(() => false)
  check('Treasurer sees "Release 100 NIM to Treasurer" button', releaseVisible)

  if (releaseVisible) {
    await releaseBtn.click()
    await page.waitForTimeout(2000)

    const successMsg = await page.getByText(/payout released|released successfully|bob is up next/i).isVisible().catch(() => false)
    check('Withdraw succeeds with confirmation message', successMsg)

    // Test 3: Post-withdraw contribute alerts
    await page.goto(BASE)
    await page.waitForTimeout(1000)

    const bobContribute = await page.evaluate((memberB) => {
      const alerts = JSON.parse(localStorage.getItem('ajocoin-alerts') || '[]')
      return alerts.some(
        a => a.recipientAddress === memberB && a.type === 'contribute_now' && a.round === 2 && !a.read
      )
    }, MEMBER_B)
    check('Post-withdraw "contribute_now" alert stored for Bob (round 2)', bobContribute)

    const bobUpNext = await page.evaluate((memberB) => {
      const alerts = JSON.parse(localStorage.getItem('ajocoin-alerts') || '[]')
      return alerts.some(
        a => a.recipientAddress === memberB && a.type === 'up_next' && a.round === 2 && !a.read
      )
    }, MEMBER_B)
    check('Post-withdraw "up_next" alert stored for Bob (round 2)', bobUpNext)
  }

  // Test 4: Dismiss alert
  const dismissBtn = page.locator('[aria-label="Dismiss"]').first()
  if (await dismissBtn.isVisible().catch(() => false)) {
    await dismissBtn.click()
    await page.waitForTimeout(500)
    const dismissed = !(await page.getByText(/your turn to withdraw/i).isVisible().catch(() => false))
    check('Dismiss removes alert from view', dismissed)
  }

  await browser.close()

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})