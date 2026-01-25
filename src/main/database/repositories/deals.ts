import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { Deal, DealWithContact } from '../types'

export function getAllDeals(pipelineId?: string): DealWithContact[] {
  if (pipelineId) {
    return query<DealWithContact>(`
      SELECT d.*, c.name as contact_name, c.company as contact_company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.pipeline_id = ? AND d.deleted_at IS NULL
      ORDER BY d.updated_at DESC
    `, [pipelineId])
  }

  return query<DealWithContact>(`
    SELECT d.*, c.name as contact_name, c.company as contact_company
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.deleted_at IS NULL
    ORDER BY d.updated_at DESC
  `)
}

export function getDealById(id: string): DealWithContact | null {
  return queryOne<DealWithContact>(`
    SELECT d.*, c.name as contact_name, c.company as contact_company
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.id = ? AND d.deleted_at IS NULL
  `, [id])
}

export function getDealsByContact(contactId: string): DealWithContact[] {
  return query<DealWithContact>(`
    SELECT d.*, c.name as contact_name, c.company as contact_company
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.contact_id = ? AND d.deleted_at IS NULL
    ORDER BY d.updated_at DESC
  `, [contactId])
}

export function getDealsByStage(pipelineId: string, stage: string): DealWithContact[] {
  return query<DealWithContact>(`
    SELECT d.*, c.name as contact_name, c.company as contact_company
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.pipeline_id = ? AND d.stage = ? AND d.deleted_at IS NULL AND d.closed_at IS NULL
    ORDER BY d.updated_at DESC
  `, [pipelineId, stage])
}

export function createDeal(data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'won' | 'deleted_at'>): Deal {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(`
    INSERT INTO deals (id, pipeline_id, contact_id, name, value, currency, stage, probability, expected_close, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.pipeline_id,
    data.contact_id,
    data.name,
    data.value || 0,
    data.currency || 'USD',
    data.stage,
    data.probability || 50,
    data.expected_close,
    data.notes
  , now, now])

  return getDealById(id)!
}

export function updateDeal(id: string, data: Partial<Deal>): Deal | null {
  const existing = getDealById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const params: unknown[] = [now]

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.contact_id !== undefined) {
    updates.push('contact_id = ?')
    params.push(data.contact_id)
  }
  if (data.value !== undefined) {
    updates.push('value = ?')
    params.push(data.value)
  }
  if (data.currency !== undefined) {
    updates.push('currency = ?')
    params.push(data.currency)
  }
  if (data.stage !== undefined) {
    updates.push('stage = ?')
    params.push(data.stage)
  }
  if (data.probability !== undefined) {
    updates.push('probability = ?')
    params.push(data.probability)
  }
  if (data.expected_close !== undefined) {
    updates.push('expected_close = ?')
    params.push(data.expected_close)
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?')
    params.push(data.notes)
  }

  params.push(id)
  run(`UPDATE deals SET ${updates.join(', ')} WHERE id = ?`, params)

  return getDealById(id)
}

export function moveDealToStage(id: string, stage: string): Deal | null {
  const now = new Date().toISOString()
  run('UPDATE deals SET stage = ?, updated_at = ? WHERE id = ?', [stage, now, id])
  return getDealById(id)
}

export function closeDeal(id: string, won: boolean): Deal | null {
  const now = new Date().toISOString()
  const stage = won ? 'closed_won' : 'closed_lost'
  
  run(
    'UPDATE deals SET stage = ?, won = ?, closed_at = ?, updated_at = ? WHERE id = ?',
    [stage, won ? 1 : 0, now, now, id]
  )
  
  return getDealById(id)
}

export function reopenDeal(id: string, stage: string): Deal | null {
  const now = new Date().toISOString()
  
  run(
    'UPDATE deals SET stage = ?, won = NULL, closed_at = NULL, updated_at = ? WHERE id = ?',
    [stage, now, id]
  )
  
  return getDealById(id)
}

export function deleteDeal(id: string): void {
  const now = new Date().toISOString()
  run('UPDATE deals SET deleted_at = ? WHERE id = ?', [now, id])
}

export function hardDeleteDeal(id: string): void {
  run('DELETE FROM deals WHERE id = ?', [id])
}

export function getDealCount(pipelineId?: string): number {
  if (pipelineId) {
    const result = queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM deals WHERE pipeline_id = ? AND deleted_at IS NULL',
      [pipelineId]
    )
    return result?.count || 0
  }

  const result = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM deals WHERE deleted_at IS NULL'
  )
  return result?.count || 0
}

export function getOpenDealsValue(pipelineId?: string): number {
  if (pipelineId) {
    const result = queryOne<{ total: number }>(
      'SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE pipeline_id = ? AND deleted_at IS NULL AND closed_at IS NULL',
      [pipelineId]
    )
    return result?.total || 0
  }

  const result = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(value), 0) as total FROM deals WHERE deleted_at IS NULL AND closed_at IS NULL'
  )
  return result?.total || 0
}

export function getClosedDealsStats(pipelineId?: string, days: number = 30): {
  won: { count: number; value: number }
  lost: { count: number; value: number }
  winRate: number
} {
  const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  
  let wonResult: { count: number; value: number } | undefined
  let lostResult: { count: number; value: number } | undefined

  if (pipelineId) {
    wonResult = queryOne<{ count: number; value: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
       FROM deals WHERE pipeline_id = ? AND won = 1 AND closed_at >= ? AND deleted_at IS NULL`,
      [pipelineId, dateThreshold]
    )
    lostResult = queryOne<{ count: number; value: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
       FROM deals WHERE pipeline_id = ? AND won = 0 AND closed_at >= ? AND deleted_at IS NULL`,
      [pipelineId, dateThreshold]
    )
  } else {
    wonResult = queryOne<{ count: number; value: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
       FROM deals WHERE won = 1 AND closed_at >= ? AND deleted_at IS NULL`,
      [dateThreshold]
    )
    lostResult = queryOne<{ count: number; value: number }>(
      `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
       FROM deals WHERE won = 0 AND closed_at >= ? AND deleted_at IS NULL`,
      [dateThreshold]
    )
  }

  const won = { count: wonResult?.count || 0, value: wonResult?.value || 0 }
  const lost = { count: lostResult?.count || 0, value: lostResult?.value || 0 }
  const total = won.count + lost.count
  const winRate = total > 0 ? (won.count / total) * 100 : 0

  return { won, lost, winRate }
}

export function getExpectedCloseThisMonth(pipelineId?: string): DealWithContact[] {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  if (pipelineId) {
    return query<DealWithContact>(`
      SELECT d.*, c.name as contact_name, c.company as contact_company
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      WHERE d.pipeline_id = ? AND d.expected_close >= ? AND d.expected_close <= ?
        AND d.deleted_at IS NULL AND d.closed_at IS NULL
      ORDER BY d.expected_close ASC
    `, [pipelineId, startOfMonth, endOfMonth])
  }

  return query<DealWithContact>(`
    SELECT d.*, c.name as contact_name, c.company as contact_company
    FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.expected_close >= ? AND d.expected_close <= ?
      AND d.deleted_at IS NULL AND d.closed_at IS NULL
    ORDER BY d.expected_close ASC
  `, [startOfMonth, endOfMonth])
}

export function getWeightedPipelineValue(pipelineId?: string): number {
  if (pipelineId) {
    const result = queryOne<{ total: number }>(
      `SELECT COALESCE(SUM(value * probability / 100.0), 0) as total 
       FROM deals WHERE pipeline_id = ? AND deleted_at IS NULL AND closed_at IS NULL`,
      [pipelineId]
    )
    return result?.total || 0
  }

  const result = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(value * probability / 100.0), 0) as total 
     FROM deals WHERE deleted_at IS NULL AND closed_at IS NULL`
  )
  return result?.total || 0
}
