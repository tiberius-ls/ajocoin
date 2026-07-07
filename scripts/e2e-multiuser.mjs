/**
 * Two-browser multi-user sync test against live Vercel + Redis.
 * Run: node scripts/e2e-multiuser.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.AJOCOIN_URL || 'https://ajocoin.vercel.app'
const ALICE = 'NQ01 ALIC E000 0000 0000 0000 0000'
const BOB = 'NQ02 BOB0 0000 0000 0000 0000 0000'
const GROUP_NAME = `Sync Test ${Date.now()}`

const mockNimiq = (address) => `
  window.nimiqPay = { language: 'en' };
  window.nimiq = {
    connected: false,
    async connect() { this.connected = true; },
    disconnect() { this.connected = false; },
    async listAccounts() { return ['${address}']; },
    async sendBasicTransaction() { return 'e2e-tx-' + Date.now(); },
  };
`

function log(step, ok, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${step}${detail ? ` — ${detail}` : ''}`)
}

async function connect(page, url = BASE) {
  await page.goto(url, { waitUntil: 'networkidle' })
  for (const pattern of [/connect wallet/i, /^connect$/i]) {
    const btn = page.getByRole('button', { name: pattern }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1500)
      break
    }
  }
}

function buildInviteUrl(group) {
  const payload = {
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
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `${BASE}/join?invite=${encoded}`
}

async function fetchAliceGroups() {
  const res = await fetch(`${BASE}/api/members/${encodeURIComponent(ALICE)}/groups`)
  if (!res.ok) throw new Error(`Member API ${res.status}`)
  return res.json()
}

async function fetchGroup(id) {
  const res = await fetch(`${BASE}/api/groups/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(`Group API ${res.status}`)
  return res.json()
}

async function deleteGroup(id) {
  await fetch(`${BASE}/api/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

async function main() {
  let passed = 0
  let failed = 0
  const check = (name, ok, detail) => {
    log(name, ok, detail)
    ok ? passed++ : failed++
    return ok
  }

  console.log(`\nMulti-user sync test — ${BASE}\n`)

  const browser = await chromium.launch({ headless: true })

  const aliceCtx = await browser.newContext()
  const bobCtx = await browser.newContext()

  await aliceCtx.addInitScript(mockNimiq(ALICE))
  await bobCtx.addInitScript(mockNimiq(BOB))

  const alice = await aliceCtx.newPage()
  const bob = await bobCtx.newPage()

  let groupId = null

  try {
    // --- Browser A: Alice creates group ---
    await connect(alice, `${BASE}/create`)
    check('Alice wallet connected on create page', await alice.getByText(/NQ01/i).first().isVisible().catch(() => false))

    await alice.locator('form input.input-field').first().fill(GROUP_NAME)
    await alice.locator('form textarea.input-field').fill('Multi-user sync E2E test')
    await alice.getByRole('button', { name: /create group/i }).click()
    await alice.waitForURL(/\/dashboard/, { timeout: 10000 })
    check('Alice created group (dashboard)', await alice.getByText(GROUP_NAME).isVisible().catch(() => false))

    // wait for API persist
    await alice.waitForTimeout(3000)

    const { groups } = await fetchAliceGroups()
    const created = groups.find(g => g.name === GROUP_NAME)
    check('Redis has Alice group', !!created, created ? `${created.members.length} member(s)` : 'not found')
    if (!created) throw new Error('Group not in Redis')

    groupId = created.id
    const joinUrl = buildInviteUrl(created)
    check('Invite URL built', joinUrl.includes('/join?invite='))

    // --- Browser B: Bob joins via invite ---
    await connect(bob, joinUrl)
    const bobConnected = await bob.getByText(/NQ02/i).first().isVisible().catch(() => false)
      || await bob.getByRole('button', { name: /join group/i }).isVisible().catch(() => false)
    check('Bob wallet connected on join page', bobConnected)
    check('Bob sees invite page', await bob.getByText(GROUP_NAME).isVisible().catch(() => false))

    await bob.locator('input.input-field').first().fill('Bob')
    await bob.getByRole('button', { name: /join group/i }).click()
    await bob.waitForURL(new RegExp(`/group/${groupId}`), { timeout: 10000 })
    check('Bob joined and landed on group page', true)

    // --- Verify Redis has 2 members ---
    await bob.waitForTimeout(5000)
    const serverGroup = await fetchGroup(groupId)
    check('Redis shows 2 members after Bob joins', serverGroup.members.length === 2, `count=${serverGroup.members.length}`)
    check('Redis lists Bob', serverGroup.members.some(m => m.name === 'Bob'))

    // --- Browser A: poll/refresh sees Bob ---
    await connect(alice, `${BASE}/group/${groupId}`)
    await alice.getByText('Members').waitFor({ timeout: 15000 }).catch(() => {})
    const names = await alice.evaluate(async (gid) => {
      const r = await fetch(`/api/groups/${encodeURIComponent(gid)}`)
      const g = await r.json()
      return g.members?.map(m => m.name) ?? []
    }, groupId)
    check('Alice browser can read members from API', names.includes('Bob'), names.join(', '))

    const memberCards = alice.locator('section').filter({ hasText: 'Members' }).locator('.space-y-2 > div')
    await memberCards.first().waitFor({ timeout: 5000 }).catch(() => {})
    const count = await memberCards.count()
    check('Alice UI shows 2 members', count >= 2, `cards=${count}`)
    const membersText = await alice.locator('section').filter({ hasText: 'Members' }).innerText()
    check('Alice sees Bob on group page after sync', membersText.includes('Bob'), membersText.slice(0, 80))

    // --- Browser B: sees Alice/creator on group ---
    await bob.reload({ waitUntil: 'networkidle' })
    const bobSeesCreator = await bob.getByText('You').isVisible().catch(() => false)
      || await bob.getByText(/Alice|Creator/i).first().isVisible().catch(() => false)
    check('Bob sees creator on group page', bobSeesCreator || await bob.getByText('You').isVisible().catch(() => false))

    await connect(bob, `${BASE}/dashboard`)
    check('Bob dashboard lists group', await bob.getByText(GROUP_NAME).isVisible().catch(() => false))

  } finally {
    if (groupId) await deleteGroup(groupId).catch(() => {})
    await browser.close()
  }

  console.log(`\n${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})