import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getGroup, getMemberGroupIds, isStoreConfigured } from '../../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isStoreConfigured()) {
    return res.status(503).json({ error: 'Shared store not configured. Add Vercel KV / Upstash Redis.' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const address = String(req.query.address ?? '')
  if (!address) return res.status(400).json({ error: 'Missing wallet address' })

  const ids = await getMemberGroupIds(address)
  const groups = (await Promise.all(ids.map(id => getGroup(id)))).filter(Boolean)
  return res.status(200).json({ groupIds: ids, groups })
}