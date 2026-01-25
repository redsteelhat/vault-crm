import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { FollowUp, FollowUpWithContact } from '../types'

export function getAllFollowups(): FollowUpWithContact[] {
  return query<FollowUpWithContact>(`
    SELECT f.*, c.name as contact_name, c.company as contact_company
    FROM followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.deleted_at IS NULL AND c.deleted_at IS NULL
    ORDER BY f.due_at ASC
  `)
}

export function getFollowupById(id: string): FollowUp | null {
  return queryOne<FollowUp>(`
    SELECT * FROM followups 
    WHERE id = ? AND deleted_at IS NULL
  `, [id])
}

export function getFollowupsByContact(contactId: string): FollowUp[] {
  return query<FollowUp>(`
    SELECT * FROM followups 
    WHERE contact_id = ? AND deleted_at IS NULL
    ORDER BY due_at ASC
  `, [contactId])
}

export function createFollowup(data: Omit<FollowUp, 'id' | 'created_at' | 'done_at'>): FollowUp {
  const id = uuidv4()
  const now = new Date().toISOString()
  
  run(`
    INSERT INTO followups (id, contact_id, due_at, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.contact_id,
    data.due_at,
    data.reason || null,
    data.status || 'open',
    now
  ])
  
  return getFollowupById(id)!
}

export function updateFollowup(id: string, data: Partial<FollowUp>): FollowUp | null {
  const existing = getFollowupById(id)
  if (!existing) return null
  
  const updates: string[] = []
  const params: unknown[] = []
  
  if (data.due_at !== undefined) {
    updates.push('due_at = ?')
    params.push(data.due_at)
  }
  if (data.reason !== undefined) {
    updates.push('reason = ?')
    params.push(data.reason)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }
  if (data.done_at !== undefined) {
    updates.push('done_at = ?')
    params.push(data.done_at)
  }
  
  if (updates.length === 0) return existing
  
  params.push(id)
  run(`UPDATE followups SET ${updates.join(', ')} WHERE id = ?`, params)
  
  return getFollowupById(id)
}

export function markFollowupDone(id: string): FollowUp | null {
  const now = new Date().toISOString()
  run(`
    UPDATE followups SET status = 'done', done_at = ? WHERE id = ?
  `, [now, id])
  return getFollowupById(id)
}

export function snoozeFollowup(id: string, newDate: string): FollowUp | null {
  run(`
    UPDATE followups SET due_at = ?, status = 'snoozed' WHERE id = ?
  `, [newDate, id])
  return getFollowupById(id)
}

export function deleteFollowup(id: string): void {
  const now = new Date().toISOString()
  run('UPDATE followups SET deleted_at = ? WHERE id = ?', [now, id])
}

export function getDueTodayFollowups(): FollowUpWithContact[] {
  return query<FollowUpWithContact>(`
    SELECT f.*, c.name as contact_name, c.company as contact_company
    FROM followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND f.status = 'open'
    AND date(f.due_at) = date('now')
    ORDER BY f.due_at ASC
  `)
}

export function getOverdueFollowups(): FollowUpWithContact[] {
  return query<FollowUpWithContact>(`
    SELECT f.*, c.name as contact_name, c.company as contact_company
    FROM followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND f.status = 'open'
    AND date(f.due_at) < date('now')
    ORDER BY f.due_at ASC
  `)
}

export function getUpcomingFollowups(days: number): FollowUpWithContact[] {
  return query<FollowUpWithContact>(`
    SELECT f.*, c.name as contact_name, c.company as contact_company
    FROM followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND f.status = 'open'
    AND date(f.due_at) > date('now')
    AND date(f.due_at) <= date('now', '+' || ? || ' days')
    ORDER BY f.due_at ASC
  `, [days])
}

export function getOpenFollowupsCount(): number {
  const result = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM followups 
    WHERE deleted_at IS NULL AND status = 'open'
  `)
  return result?.count || 0
}

export function getFollowupsDueSoon(hoursAhead: number = 2): FollowUpWithContact[] {
  return query<FollowUpWithContact>(`
    SELECT f.*, c.name as contact_name, c.company as contact_company
    FROM followups f
    JOIN contacts c ON f.contact_id = c.id
    WHERE f.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND f.status = 'open'
    AND datetime(f.due_at) <= datetime('now', '+' || ? || ' hours')
    AND datetime(f.due_at) >= datetime('now')
    ORDER BY f.due_at ASC
  `, [hoursAhead])
}

// Clean up old soft-deleted records (30 days retention)
export function cleanupDeletedFollowups(): number {
  const result = run(`
    DELETE FROM followups 
    WHERE deleted_at IS NOT NULL 
    AND date(deleted_at) < date('now', '-30 days')
  `)
  return result.changes
}
