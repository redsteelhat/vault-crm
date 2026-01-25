import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { Interaction, InteractionWithContact } from '../types'

export function getInteractionsByContact(contactId: string): Interaction[] {
  return query<Interaction>(`
    SELECT * FROM interactions 
    WHERE contact_id = ? AND deleted_at IS NULL
    ORDER BY occurred_at DESC
  `, [contactId])
}

export function getInteractionById(id: string): Interaction | null {
  return queryOne<Interaction>(`
    SELECT * FROM interactions 
    WHERE id = ? AND deleted_at IS NULL
  `, [id])
}

export function createInteraction(data: Omit<Interaction, 'id' | 'created_at'>): Interaction {
  const id = uuidv4()
  const now = new Date().toISOString()
  
  run(`
    INSERT INTO interactions (id, contact_id, type, body, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.contact_id,
    data.type,
    data.body,
    data.occurred_at || now,
    now
  ])
  
  // Update contact's last_contact_at
  run(`
    UPDATE contacts SET last_contact_at = ?, updated_at = ?
    WHERE id = ?
  `, [data.occurred_at || now, now, data.contact_id])
  
  return getInteractionById(id)!
}

export function updateInteraction(id: string, data: Partial<Interaction>): Interaction | null {
  const existing = getInteractionById(id)
  if (!existing) return null
  
  const updates: string[] = []
  const params: unknown[] = []
  
  if (data.type !== undefined) {
    updates.push('type = ?')
    params.push(data.type)
  }
  if (data.body !== undefined) {
    updates.push('body = ?')
    params.push(data.body)
  }
  if (data.occurred_at !== undefined) {
    updates.push('occurred_at = ?')
    params.push(data.occurred_at)
  }
  
  if (updates.length === 0) return existing
  
  params.push(id)
  run(`UPDATE interactions SET ${updates.join(', ')} WHERE id = ?`, params)
  
  return getInteractionById(id)
}

export function deleteInteraction(id: string): void {
  const now = new Date().toISOString()
  run('UPDATE interactions SET deleted_at = ? WHERE id = ?', [now, id])
}

export function hardDeleteInteraction(id: string): void {
  run('DELETE FROM interactions WHERE id = ?', [id])
}

export function getRecentInteractions(limit: number = 20): InteractionWithContact[] {
  return query<InteractionWithContact>(`
    SELECT i.*, c.name as contact_name, c.company as contact_company
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    WHERE i.deleted_at IS NULL AND c.deleted_at IS NULL
    ORDER BY i.occurred_at DESC
    LIMIT ?
  `, [limit])
}

export function getInteractionCount(): number {
  const result = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM interactions WHERE deleted_at IS NULL')
  return result?.count || 0
}

export function getInteractionsByDateRange(startDate: string, endDate: string): InteractionWithContact[] {
  return query<InteractionWithContact>(`
    SELECT i.*, c.name as contact_name, c.company as contact_company
    FROM interactions i
    JOIN contacts c ON i.contact_id = c.id
    WHERE i.deleted_at IS NULL 
    AND c.deleted_at IS NULL
    AND date(i.occurred_at) BETWEEN date(?) AND date(?)
    ORDER BY i.occurred_at DESC
  `, [startDate, endDate])
}

// Clean up old soft-deleted records (30 days retention)
export function cleanupDeletedInteractions(): number {
  const result = run(`
    DELETE FROM interactions 
    WHERE deleted_at IS NOT NULL 
    AND date(deleted_at) < date('now', '-30 days')
  `)
  return result.changes
}
