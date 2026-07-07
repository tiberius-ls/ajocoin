import { kv } from '@vercel/kv'
import type { AjoGroup, GroupActivity } from './types.js'
import { mergeTwoGroups } from './groups.js'

const groupKey = (id: string) => `group:${id}`
const activityKey = (id: string) => `activity:${id}`
const memberKey = (address: string) => `member:${normalizeAddr(address)}`

function normalizeAddr(address: string): string {
  return address.replace(/\s/g, '')
}

export function isStoreConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

export async function getGroup(id: string): Promise<AjoGroup | null> {
  return kv.get<AjoGroup>(groupKey(id))
}

export async function putGroup(group: AjoGroup): Promise<AjoGroup> {
  const existing = await getGroup(group.id)
  const merged = existing ? mergeTwoGroups(existing, group) : group
  await kv.set(groupKey(group.id), merged)

  for (const member of merged.members) {
    const key = memberKey(member.address)
    const ids = (await kv.get<string[]>(key)) ?? []
    if (!ids.includes(merged.id)) {
      await kv.set(key, [...ids, merged.id])
    }
  }

  return merged
}

export async function deleteGroup(id: string): Promise<void> {
  const group = await getGroup(id)
  await kv.del(groupKey(id))
  await kv.del(activityKey(id))

  if (group) {
    for (const member of group.members) {
      const key = memberKey(member.address)
      const ids = (await kv.get<string[]>(key)) ?? []
      await kv.set(key, ids.filter(gid => gid !== id))
    }
  }
}

export async function getMemberGroupIds(address: string): Promise<string[]> {
  return (await kv.get<string[]>(memberKey(address))) ?? []
}

export async function getActivity(groupId: string): Promise<GroupActivity> {
  return (await kv.get<GroupActivity>(activityKey(groupId))) ?? {
    contributions: [],
    withdrawals: [],
  }
}

export async function saveActivity(groupId: string, activity: GroupActivity): Promise<void> {
  await kv.set(activityKey(groupId), activity)
}