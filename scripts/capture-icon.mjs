import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'fs'

const OUT = 'submission-assets'
mkdirSync(OUT, { recursive: true })
const svg = readFileSync('public/favicon.svg', 'utf8')

async function render(size, name) {
  const html = `<!DOCTYPE html><html><body style="margin:0;background:#0a0f1a;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${svg.replace('viewBox="0 0 32 32"', `width="${size}" height="${size}" viewBox="0 0 32 32"`)}</body></html>`
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(html)
  await page.screenshot({ path: `${OUT}/${name}`, omitBackground: false })
  await browser.close()
}

await render(512, 'app-icon-512.png')
await render(240, 'thumbnail-240.png')
console.log('Saved app-icon-512.png and thumbnail-240.png')