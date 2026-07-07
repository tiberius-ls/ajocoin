import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { AjoGroup } from '../_lib/types.js'
import { deleteGroup, getGroup, isStoreConfigured, putGroup } from '../_lib/store.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isStoreConfigured()) {
    return res.status(503).json({ error: 'Shared store not configured. Add Vercel KV / Upstash Redis.' })
  }

  const id = String(req.query.id ?? '')
  if (!id) return res.status(400).json({ error: 'Missing group id' })

  if (req.method === 'GET') {
    const group = await getGroup(id)
    if (!group) return res.status(404).json({ error: 'Group not found' })
    return res.status(200).json(group)
  }

  if (req.method === 'PUT') {
    const group = req.body as AjoGroup
    if (!group?.id || group.id !== id) {
      return res.status(400).json({ error: 'Invalid group payload' })
    }
    const saved = await putGroup(group)
    return res.status(200).json(saved)
  }

  if (req.method === 'DELETE') {
    await deleteGroup(id)
    return res.status(204).end()
  }

  return res.status(405).json({ error: 'Method not allowed' })
}