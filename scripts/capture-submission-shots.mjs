import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const mock = `
  window.nimiqPay = { language: 'en' };
  window.nimiq = {
    connected: false,
    async connect() { this.connected = true; },
    disconnect() { this.connected = false; },
    async listAccounts() { return ['NQ07 TREAS URER0 0000 0000 0000 0000']; },
    async sendBasicTransaction() { return 'demo-tx'; },
  };
`

const OUT = 'submission-assets'
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript(mock)

const shots = [
  { name: '01-home', url: 'https://ajocoin.vercel.app/' },
  { name: '02-dashboard', url: 'https://ajocoin.vercel.app/dashboard' },
  { name: '03-create', url: 'https://ajocoin.vercel.app/create' },
  { name: '04-alerts', url: 'https://ajocoin.vercel.app/' },
]

for (const s of shots) {
  await page.goto(s.url, { waitUntil: 'networkidle' })
  const connect = page.getByRole('button', { name: /connect/i }).first()
  if (await connect.isVisible().catch(() => false)) {
    await connect.click()
    await page.waitForTimeout(1000)
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${s.name}.png` })
}

await browser.close()
console.log(`Saved ${shots.length} screenshots to ${OUT}/`)