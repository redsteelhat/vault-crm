import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { Tag } from '../types'

export function getAllTags(): Tag[] {
  return query<Tag>('SELECT * FROM tags ORDER BY name ASC')
}

export function getTagById(id: string): Tag | null {
  return queryOne<Tag>('SELECT * FROM tags WHERE id = ?', [id])
}

export function getTagByName(name: string): Tag | null {
  return queryOne<Tag>('SELECT * FROM tags WHERE name = ?', [name])
}

export function createTag(data: Omit<Tag, 'id'>): Tag {
  const id = uuidv4()
  
  run(`
    INSERT INTO tags (id, name, color)
    VALUES (?, ?, ?)
  `, [id, data.name, data.color])
  
  return getTagById(id)!
}

export function updateTag(id: string, data: Partial<Tag>): Tag | null {
  const existing = getTagById(id)
  if (!existing) return null
  
  const updates: string[] = []
  const params: unknown[] = []
  
  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.color !== undefined) {
    updates.push('color = ?')
    params.push(data.color)
  }
  
  if (updates.length === 0) return existing
  
  params.push(id)
  run(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?`, params)
  
  return getTagById(id)
}

export function deleteTag(id: string): void {
  // This will also delete from contact_tags due to CASCADE
  run('DELETE FROM tags WHERE id = ?', [id])
}

export function getTagContactCount(tagId: string): number {
  const result = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM contact_tags WHERE tag_id = ?
  `, [tagId])
  return result?.count || 0
}

export function getTagsWithCounts(): (Tag & { contact_count: number })[] {
  return query<Tag & { contact_count: number }>(`
    SELECT t.*, COUNT(ct.contact_id) as contact_count
    FROM tags t
    LEFT JOIN contact_tags ct ON t.id = ct.tag_id
    LEFT JOIN contacts c ON ct.contact_id = c.id AND c.deleted_at IS NULL
    GROUP BY t.id
    ORDER BY t.name ASC
  `)
}
