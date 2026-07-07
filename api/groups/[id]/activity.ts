import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { Contribution, GroupActivity, Withdrawal } from '../../_lib/types.js'
import { verifyNimTransaction } from '../../_lib/nimiq.js'
import { getActivity, getGroup, isStoreConfigured, putGroup, saveActivity } from '../../_lib/store.js'

function upsertContribution(activity: GroupActivity, c: Contribution): GroupActivity {
  const idx = activity.contributions.findIndex(x => x.id === c.id)
  const contributions = [...activity.contributions]
  if (idx >= 0) contributions[idx] = c
  else contributions.push(c)
  return { ...activity, contributions }
}

function upsertWithdrawal(activity: GroupActivity, w: Withdrawal): GroupActivity {
  if (activity.withdrawals.some(x => x.id === w.id)) return activity
  return { ...activity, withdrawals: [...activity.withdrawals, w] }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isStoreConfigured()) {
    return res.status(503).json({ error: 'Shared store not configured. Add Vercel KV / Upstash Redis.' })
  }

  const groupId = String(req.query.id ?? '')
  if (!groupId) return res.status(400).json({ error: 'Missing group id' })

  if (req.method === 'GET') {
    const activity = await getActivity(groupId)
    return res.status(200).json(activity)
  }

  if (req.method === 'POST') {
    const group = await getGroup(groupId)
    if (!group) return res.status(404).json({ error: 'Group not found' })

    const body = req.body as {
      type: 'contribution' | 'withdrawal'
      record: Contribution | Withdrawal
    }

    let activity = await getActivity(groupId)

    if (body.type === 'contribution') {
      const record = body.record as Contribution
      if (!record?.txHash) {
        return res.status(400).json({ error: 'Contribution requires txHash' })
      }

      const verification = await verifyNimTransaction({
        txHash: record.txHash,
        senderAddress: record.memberAddress,
        recipientAddress: group.treasuryAddress,
        amountNim: record.amount,
      })

      const status = verification.ok ? 'confirmed' : 'pending'
      const contribution: Contribution = { ...record, status, groupId }

      activity = upsertContribution(activity, contribution)
      await saveActivity(groupId, activity)

      if (status === 'confirmed') {
        const updated = {
          ...group,
          members: group.members.map(m =>
            m.address === record.memberAddress ? { ...m, hasContributed: true } : m
          ),
        }
        await putGroup(updated)
      }

      return res.status(200).json({ contribution, verification })
    }

    if (body.type === 'withdrawal') {
      const record = body.record as Withdrawal
      if (record.txHash) {
        const verification = await verifyNimTransaction({
          txHash: record.txHash,
          senderAddress: group.treasuryAddress,
          recipientAddress: record.memberAddress,
          amountNim: record.amount,
        })
        if (!verification.ok) {
          return res.status(422).json({ error: 'Withdrawal transaction could not be verified', verification })
        }
      }

      activity = upsertWithdrawal(activity, { ...record, groupId })
      await saveActivity(groupId, activity)
      return res.status(200).json({ withdrawal: record })
    }

    return res.status(400).json({ error: 'Invalid activity type' })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}