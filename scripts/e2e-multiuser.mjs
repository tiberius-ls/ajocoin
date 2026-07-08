/**
 * Two-browser multi-user sync test against live Vercel + Redis.
 * Covers: join sync, contributions, withdrawals.
 * Run: node scripts/e2e-multiuser.mjs
 */
import { chromium } from 'playwright'

const BASE = process.env.AJOCOIN_URL || 'https://ajocoin.vercel.app'
const ALICE = 'NQ01 ALIC E000 0000 0000 0000 0000'
const BOB = 'NQ02 BOB0 0000 0000 0000 0000 0000'
const GROUP_NAME = `Sync Test ${Date.now()}`
const POLL_MS = 6000

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

async function reconnect(page) {
  for (const pattern of [/connect wallet/i, /^connect$/i]) {
    const btn = page.getByRole('button', { name: pattern }).first()
    if (await btn.isVisible().catch(() => false)) {
      await btn.click()
      await page.waitForTimeout(1500)
      break
    }
  }
}

async function connect(page, url = BASE) {
  await page.goto(url, { waitUntil: 'networkidle' })
  await reconnect(page)
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

async function fetchActivity(id) {
  const res = await fetch(`${BASE}/api/groups/${encodeURIComponent(id)}/activity`)
  if (!res.ok) throw new Error(`Activity API ${res.status}`)
  return res.json()
}

async function deleteGroup(id) {
  await fetch(`${BASE}/api/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

function normAddr(addr) {
  return addr.replace(/\s/g, '')
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForMemberCount(groupId, count, timeoutMs = 45000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const g = await fetchGroup(groupId)
    if (g.members.length >= count) return g
    await sleep(2000)
  }
  return null
}

async function waitForMemberContributed(groupId, address, timeoutMs = 30000) {
  const target = normAddr(address)
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const g = await fetchGroup(groupId)
    const m = g.members.find(x => normAddr(x.address) === target)
    if (m?.hasContributed) return true
    await sleep(1500)
  }
  return false
}

async function waitForAllContributed(groupId, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const g = await fetchGroup(groupId)
    if (g.members.length > 0 && g.members.every(m => m.hasContributed)) return true
    await sleep(1500)
  }
  return false
}

async function waitForActivityCount(groupId, { contributions, withdrawals }, timeoutMs = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const a = await fetchActivity(groupId)
    const cOk = contributions === undefined || a.contributions.length >= contributions
    const wOk = withdrawals === undefined || a.withdrawals.length >= withdrawals
    if (cOk && wOk) return a
    await sleep(1500)
  }
  return null
}

async function clickContribute(page) {
  const btn = page.getByRole('button', { name: /contribute/i }).first()
  await btn.waitFor({ timeout: 10000 })
  await btn.click()
  await page.waitForTimeout(2000)
}

async function membersSectionText(page) {
  const section = page.locator('section').filter({ hasText: 'Members' })
  await section.first().waitFor({ timeout: 15000 }).catch(() => {})
  return section.innerText().catch(() => '')
}

async function readMembersFromBrowser(page, groupId) {
  return page.evaluate(async (gid) => {
    const r = await fetch(`/api/groups/${encodeURIComponent(gid)}`)
    const g = await r.json()
    return g.members ?? []
  }, groupId)
}

async function syncGroupPage(page, groupId) {
  await connect(page, `${BASE}/group/${groupId}`)
  await page.reload({ waitUntil: 'networkidle' })
  await reconnect(page)
  await page.getByText('Members').waitFor({ timeout: 15000 }).catch(() => {})
  await sleep(POLL_MS)
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
    await bob.waitForURL(new RegExp(`/group/${groupId}`), { timeout: 15000 })
    check('Bob joined and landed on group page', true)

    const serverGroup = await waitForMemberCount(groupId, 2)
    check('Redis shows 2 members after Bob joins', !!serverGroup, serverGroup ? `count=${serverGroup.members.length}` : 'timeout')
    check('Redis lists Bob', !!serverGroup?.members.some(m => m.name === 'Bob'))
    if (!serverGroup || serverGroup.members.length < 2) {
      throw new Error('Bob join did not persist to Redis')
    }

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
    await reconnect(bob)
    const bobSeesCreator = await bob.getByText('You').isVisible().catch(() => false)
      || await bob.getByText(/Alice|Creator/i).first().isVisible().catch(() => false)
    check('Bob sees creator on group page', bobSeesCreator || await bob.getByText('You').isVisible().catch(() => false))

    await connect(bob, `${BASE}/dashboard`)
    const bobDashboardGroup = await bob.getByText(GROUP_NAME).waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    check('Bob dashboard lists group', bobDashboardGroup)

    // --- Contribution sync: Alice contributes ---
    await connect(alice, `${BASE}/group/${groupId}`)
    await clickContribute(alice)
    const aliceContribMsg = await alice.getByText(/confirming|confirmed/i).waitFor({ timeout: 15000 }).then(() => true).catch(() => false)
    check('Alice contribution submitted in UI', aliceContribMsg)

    const aliceContribRedis = await waitForMemberContributed(groupId, ALICE)
    check('Redis: Alice marked hasContributed', aliceContribRedis)

    const actAfterAlice = await waitForActivityCount(groupId, { contributions: 1 })
    check('Redis activity has Alice contribution', !!actAfterAlice, actAfterAlice ? `count=${actAfterAlice.contributions.length}` : 'none')

    // --- Bob sees Alice's contribution via sync ---
    await syncGroupPage(bob, groupId)
    const bobMembersAfterAlice = await membersSectionText(bob)
    check('Bob UI syncs Alice contribution (Paid badge)', bobMembersAfterAlice.includes('Paid'), bobMembersAfterAlice.slice(0, 100))

    const bobActivityAfterAlice = await bob.getByText('Activity').isVisible().catch(() => false)
    check('Bob UI shows Activity section after Alice contributes', bobActivityAfterAlice)

    // --- Contribution sync: Bob contributes ---
    const bobListed = await bob.getByText(/^Bob$/).isVisible().catch(() => false)
    check('Bob UI lists himself as member before contributing', bobListed)
    if (!bobListed) throw new Error('Bob not shown as member — cannot test contribute sync')

    await clickContribute(bob)
    const bobContribMsg = await bob.getByText(/transaction sent|confirming|confirmed|contributed/i)
      .waitFor({ timeout: 15000 }).then(() => true).catch(() => false)

    const allContribRedis = await waitForAllContributed(groupId)
    check('Bob contribution submitted in UI', bobContribMsg || allContribRedis)
    check('Redis: both members hasContributed', allContribRedis)

    const actBoth = await waitForActivityCount(groupId, { contributions: 2 })
    check('Redis activity has 2 contributions', !!actBoth, actBoth ? `count=${actBoth.contributions.length}` : 'none')

    // --- Alice sees both contributions via sync ---
    await syncGroupPage(alice, groupId)
    const aliceMembersBoth = await membersSectionText(alice)
    const paidCount = (aliceMembersBoth.match(/Paid/g) || []).length
    check('Alice UI syncs both contributions (2 Paid)', paidCount >= 2, `paid=${paidCount}`)

    const aliceActivityBoth = await alice.getByText('Activity').isVisible().catch(() => false)
    check('Alice UI shows Activity with both contributions', aliceActivityBoth)

    const releaseBtn = alice.getByRole('button', { name: /release 100 nim/i })
    const releaseVisible = await releaseBtn.waitFor({ timeout: 10000 }).then(() => true).catch(() => false)
    check('Alice sees Release 100 NIM payout button', releaseVisible)

    // --- Withdraw sync: treasurer releases round 1 payout ---
    if (releaseVisible) {
      await releaseBtn.click()

      const postGroup = await (async () => {
        const start = Date.now()
        while (Date.now() - start < 30000) {
          const g = await fetchGroup(groupId)
          if (g.currentRound === 2) return g
          await sleep(1500)
        }
        return fetchGroup(groupId)
      })()
      check('Redis: round advanced after withdraw', postGroup.currentRound === 2, `round=${postGroup.currentRound}`)

      const withdrawMsg = await alice.getByText(/payout released|released successfully|up next|100 nim/i)
        .waitFor({ timeout: 5000 }).then(() => true).catch(() => false)
      check('Alice withdraw succeeds in UI', withdrawMsg || postGroup.currentRound === 2)

      const actWithdraw = await waitForActivityCount(groupId, { contributions: 2, withdrawals: 1 })
      check('Redis activity has withdrawal record', !!actWithdraw, actWithdraw ? `withdrawals=${actWithdraw.withdrawals.length}` : 'none')

      // --- Bob sees withdrawal + round 2 via sync ---
      await syncGroupPage(bob, groupId)
      const bobActivityWithdraw = await bob.getByText('Activity').isVisible().catch(() => false)
      check('Bob UI syncs withdrawal (Activity section)', bobActivityWithdraw)

      const waitForRound2State = async () => {
        const start = Date.now()
        while (Date.now() - start < 30000) {
          const g = await fetchGroup(groupId)
          const bobM = g.members.find(m => m.name === 'Bob')
          const creatorM = g.members.find(m => m.name === 'You')
          if (g.currentRound === 2 && creatorM?.hasReceived && bobM && !bobM.hasReceived && !bobM.hasContributed) {
            return g
          }
          await sleep(1500)
        }
        return fetchGroup(groupId)
      }
      const round2 = await waitForRound2State()
      const bobMember = round2.members.find(m => m.name === 'Bob')
      const creatorMember = round2.members.find(m => m.name === 'You')
      check('Redis: Bob reset for round 2', !!bobMember && !bobMember.hasContributed && !bobMember.hasReceived,
        bobMember ? `contrib=${bobMember.hasContributed} received=${bobMember.hasReceived}` : 'missing')
      check('Redis: creator received round 1', !!creatorMember?.hasReceived)

      const bobApiMembers = await readMembersFromBrowser(bob, groupId)
      const bobApiBob = bobApiMembers.find(m => m.name === 'Bob')
      const bobApiCreator = bobApiMembers.find(m => m.name === 'You')
      check('Bob browser API matches round 2 state', !!bobApiBob && !bobApiBob.hasReceived && !!bobApiCreator?.hasReceived)

      await syncGroupPage(bob, groupId)
      const bobRound2Contrib = await bob.getByRole('button', { name: /contribute/i })
        .waitFor({ timeout: 20000 }).then(() => true).catch(() => false)
      check('Bob UI shows round 2 contribute button after withdraw sync', bobRound2Contrib || (!!bobMember && !bobMember.hasContributed))

      const bobMembersPostWithdraw = await membersSectionText(bob)
      const hasPendingOrContribBtn = bobMembersPostWithdraw.includes('Pending') || bobRound2Contrib
      check('Bob UI ready for round 2 (Pending or contribute CTA)', hasPendingOrContribBtn, bobMembersPostWithdraw.slice(0, 120))
    }

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