import type { AjoGroup, Contribution, GroupActivity, Withdrawal } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `API ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function isServerStoreEnabled(): boolean {
  return import.meta.env.VITE_USE_SHARED_STORE !== 'false'
}

export async function fetchGroup(id: string): Promise<AjoGroup | null> {
  try {
    return await request<AjoGroup>(`/groups/${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function putGroupRemote(group: AjoGroup): Promise<AjoGroup | null> {
  try {
    return await request<AjoGroup>(`/groups/${encodeURIComponent(group.id)}`, {
      method: 'PUT',
      body: JSON.stringify(group),
    })
  } catch {
    return null
  }
}

export async function deleteGroupRemote(id: string): Promise<void> {
  await request(`/groups/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchMemberGroups(address: string): Promise<AjoGroup[]> {
  const data = await request<{ groups: AjoGroup[] }>(
    `/members/${encodeURIComponent(address)}/groups`
  )
  return data.groups ?? []
}

export async function fetchGroupActivity(groupId: string): Promise<GroupActivity> {
  return request<GroupActivity>(`/groups/${encodeURIComponent(groupId)}/activity`)
}

export async function postContribution(
  record: Contribution
): Promise<{ contribution: Contribution; verification?: unknown }> {
  return request(`/groups/${encodeURIComponent(record.groupId)}/activity`, {
    method: 'POST',
    body: JSON.stringify({ type: 'contribution', record }),
  })
}

export async function postWithdrawal(
  record: Withdrawal
): Promise<{ withdrawal: Withdrawal }> {
  return request(`/groups/${encodeURIComponent(record.groupId)}/activity`, {
    method: 'POST',
    body: JSON.stringify({ type: 'withdrawal', record }),
  })
}

export async function confirmContribution(
  contributionId: string,
  groupId: string
): Promise<{ contribution: Contribution; confirmed?: boolean }> {
  return request(`/contributions/${encodeURIComponent(contributionId)}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ groupId }),
  })
}