import { getAuthenticatedClient, getUserId } from './supabase'
import { debugError } from './debug'

export interface SyncableRecord {
  id: string
  updatedAt: string
}

export async function upsertRecords<T extends SyncableRecord>(
  table: string,
  records: T[]
): Promise<number> {
  const userId = getUserId()
  if (!userId) return 0

  const client = await getAuthenticatedClient()
  if (!client) return 0

  let count = 0
  for (const record of records) {
    const { error } = await client
      .from(table)
      .upsert({
        user_id: userId,
        id: record.id,
        data: record,
        updated_at: record.updatedAt
      }, { onConflict: 'user_id,id' })

    if (!error) count++
    else debugError(`[SupabaseData] Error upserting ${table}/${record.id}: ${error}`)
  }
  return count
}

export async function downloadRecords<T>(
  table: string
): Promise<T[]> {
  const userId = getUserId()
  if (!userId) return []

  const client = await getAuthenticatedClient()
  if (!client) return []

  const { data, error } = await client
    .from(table)
    .select('data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true })

  if (error) {
    debugError(`[SupabaseData] Error downloading ${table}: ${error}`)
    return []
  }

  return (data || []).map(row => row.data as T)
}

export async function deleteRemoteRecord(
  table: string,
  recordId: string
): Promise<boolean> {
  const userId = getUserId()
  if (!userId) return false

  const client = await getAuthenticatedClient()
  if (!client) return false

  const { error } = await client
    .from(table)
    .delete()
    .eq('user_id', userId)
    .eq('id', recordId)

  if (error) {
    debugError(`[SupabaseData] Error deleting ${table}/${recordId}: ${error}`)
    return false
  }
  return true
}

export async function fetchFromTable<T>(
  table: string
): Promise<T[]> {
  let client: any = null
  try { client = await getAuthenticatedClient() } catch {}
  if (!client) return []

  const { data, error } = await client
    .from(table)
    .select('*')

  if (error) {
    debugError(`[SupabaseData] Error fetching ${table}: ${error}`)
    return []
  }

  return data?.map(row => {
    if (!row || typeof row !== 'object') return row
    let d = (row as any).data
    if (typeof d === 'string') {
      try { d = JSON.parse(d) } catch {}
    }
    if (d && typeof d === 'object') {
      return { id: (row as any).id, name: (row as any).name, ...d }
    }
    return row
  }) || []
}
