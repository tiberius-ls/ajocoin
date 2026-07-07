import type { VercelRequest, VercelResponse } from '@vercel/node'
import { verifyNimTransaction } from '../../_lib/nimiq.js'
import { getActivity, getGroup, isStoreConfigured, putGroup, saveActivity } from '../../_lib/store.js'

/** Re-check a pending contribution against the chain (polling / manual refresh). */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isStoreConfigured()) {
    return res.status(503).json({ error: 'Shared store not configured' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const contributionId = String(req.query.id ?? '')
  const { groupId } = req.body as { groupId?: string }
  if (!contributionId || !groupId) {
    return res.status(400).json({ error: 'Missing contribution id or groupId' })
  }

  const group = await getGroup(groupId)
  if (!group) return res.status(404).json({ error: 'Group not found' })

  const activity = await getActivity(groupId)
  const idx = activity.contributions.findIndex(c => c.id === contributionId)
  if (idx < 0) return res.status(404).json({ error: 'Contribution not found' })

  const record = activity.contributions[idx]
  if (record.status === 'confirmed') {
    return res.status(200).json({ contribution: record, alreadyConfirmed: true })
  }
  if (!record.txHash) {
    return res.status(400).json({ error: 'Contribution has no txHash' })
  }

  const verification = await verifyNimTransaction({
    txHash: record.txHash,
    senderAddress: record.memberAddress,
    recipientAddress: group.treasuryAddress,
    amountNim: record.amount,
  })

  if (!verification.ok) {
    return res.status(200).json({ contribution: record, verification, confirmed: false })
  }

  const confirmed = { ...record, status: 'confirmed' as const }
  const contributions = [...activity.contributions]
  contributions[idx] = confirmed
  await saveActivity(groupId, { ...activity, contributions })

  const updated = {
    ...group,
    members: group.members.map(m =>
      m.address === record.memberAddress ? { ...m, hasContributed: true } : m
    ),
  }
  await putGroup(updated)

  return res.status(200).json({ contribution: confirmed, verification, confirmed: true })
}