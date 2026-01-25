import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run, transaction, saveDatabase, getDb } from '../sqlite/connection'
import type { Contact, Tag } from '../types'

export function getAllContacts(): Contact[] {
  return query<Contact>(`
    SELECT * FROM contacts 
    WHERE deleted_at IS NULL 
    ORDER BY updated_at DESC
  `)
}

export function getContactById(id: string): Contact | null {
  return queryOne<Contact>(`
    SELECT * FROM contacts 
    WHERE id = ? AND deleted_at IS NULL
  `, [id])
}

export function createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
  const id = uuidv4()
  const now = new Date().toISOString()
  
  run(`
    INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name,
    data.company || null,
    data.title || null,
    data.emails || '[]',
    data.phones || '[]',
    data.location || null,
    data.source || null,
    data.notes || null,
    data.last_contact_at || null,
    now,
    now
  ])
  
  return getContactById(id)!
}

export function updateContact(id: string, data: Partial<Contact>): Contact | null {
  const existing = getContactById(id)
  if (!existing) return null
  
  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const params: unknown[] = [now]
  
  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.company !== undefined) {
    updates.push('company = ?')
    params.push(data.company)
  }
  if (data.title !== undefined) {
    updates.push('title = ?')
    params.push(data.title)
  }
  if (data.emails !== undefined) {
    updates.push('emails = ?')
    params.push(data.emails)
  }
  if (data.phones !== undefined) {
    updates.push('phones = ?')
    params.push(data.phones)
  }
  if (data.location !== undefined) {
    updates.push('location = ?')
    params.push(data.location)
  }
  if (data.source !== undefined) {
    updates.push('source = ?')
    params.push(data.source)
  }
  if (data.notes !== undefined) {
    updates.push('notes = ?')
    params.push(data.notes)
  }
  if (data.last_contact_at !== undefined) {
    updates.push('last_contact_at = ?')
    params.push(data.last_contact_at)
  }
  
  params.push(id)
  
  run(`UPDATE contacts SET ${updates.join(', ')} WHERE id = ?`, params)
  
  return getContactById(id)
}

export function deleteContact(id: string): void {
  // Soft delete
  const now = new Date().toISOString()
  run('UPDATE contacts SET deleted_at = ? WHERE id = ?', [now, id])
}

export function hardDeleteContact(id: string): void {
  run('DELETE FROM contacts WHERE id = ?', [id])
}

export function searchContacts(searchQuery: string): Contact[] {
  if (!searchQuery.trim()) {
    return getAllContacts()
  }
  
  // Use LIKE search with case-insensitive matching
  const pattern = `%${searchQuery.toLowerCase()}%`
  return query<Contact>(`
    SELECT * FROM contacts 
    WHERE deleted_at IS NULL AND (
      lower(name) LIKE ? OR 
      lower(company) LIKE ? OR 
      lower(title) LIKE ? OR 
      lower(emails) LIKE ? OR 
      lower(notes) LIKE ?
    )
    ORDER BY 
      CASE WHEN lower(name) LIKE ? THEN 0 ELSE 1 END,
      updated_at DESC
    LIMIT 50
  `, [pattern, pattern, pattern, pattern, pattern, pattern])
}

export function getContactsByTag(tagId: string): Contact[] {
  return query<Contact>(`
    SELECT c.* FROM contacts c
    JOIN contact_tags ct ON c.id = ct.contact_id
    WHERE ct.tag_id = ? AND c.deleted_at IS NULL
    ORDER BY c.updated_at DESC
  `, [tagId])
}

export function addTagToContact(contactId: string, tagId: string): void {
  run(`
    INSERT OR IGNORE INTO contact_tags (contact_id, tag_id)
    VALUES (?, ?)
  `, [contactId, tagId])
}

export function removeTagFromContact(contactId: string, tagId: string): void {
  run('DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?', [contactId, tagId])
}

export function getContactTags_(contactId: string): Tag[] {
  return query<Tag>(`
    SELECT t.* FROM tags t
    JOIN contact_tags ct ON t.id = ct.tag_id
    WHERE ct.contact_id = ?
  `, [contactId])
}

export function checkDuplicateByEmail(email: string): Contact | null {
  if (!email) return null
  
  // Search in emails JSON array
  const pattern = `%${email}%`
  return queryOne<Contact>(`
    SELECT * FROM contacts 
    WHERE deleted_at IS NULL AND emails LIKE ?
    LIMIT 1
  `, [pattern])
}

// Smart list queries
export function getStaleContacts(days: number): Contact[] {
  return query<Contact>(`
    SELECT * FROM contacts 
    WHERE deleted_at IS NULL 
    AND (
      last_contact_at IS NULL 
      OR date(last_contact_at) < date('now', '-' || ? || ' days')
    )
    ORDER BY last_contact_at ASC NULLS FIRST
  `, [days])
}

export function getRecentContacts(limit: number = 10): Contact[] {
  return query<Contact>(`
    SELECT * FROM contacts 
    WHERE deleted_at IS NULL 
    ORDER BY updated_at DESC
    LIMIT ?
  `, [limit])
}

export function getHotListContacts(): Contact[] {
  return query<Contact>(`
    SELECT DISTINCT c.* FROM contacts c
    JOIN contact_tags ct ON c.id = ct.contact_id
    JOIN tags t ON ct.tag_id = t.id
    WHERE c.deleted_at IS NULL 
    AND t.name IN ('Hot Lead', 'Investor')
    ORDER BY c.last_contact_at DESC NULLS LAST
  `)
}

// Batch import contacts
export function batchCreateContacts(contacts: Omit<Contact, 'id' | 'created_at' | 'updated_at'>[]): number {
  const now = new Date().toISOString()
  let count = 0
  
  transaction(() => {
    for (const data of contacts) {
      const id = uuidv4()
      run(`
        INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        data.name,
        data.company || null,
        data.title || null,
        data.emails || '[]',
        data.phones || '[]',
        data.location || null,
        data.source || null,
        data.notes || null,
        data.last_contact_at || null,
        now,
        now
      ])
      count++
    }
  })
  
  return count
}

// Get contact count
export function getContactCount(): number {
  const result = queryOne<{ count: number }>('SELECT COUNT(*) as count FROM contacts WHERE deleted_at IS NULL')
  return result?.count || 0
}

// Clean up old soft-deleted records (30 days retention)
export function cleanupDeletedContacts(): number {
  const result = run(`
    DELETE FROM contacts 
    WHERE deleted_at IS NOT NULL 
    AND date(deleted_at) < date('now', '-30 days')
  `)
  return result.changes
}

// Get source distribution
export function getSourceDistribution(): { source: string; count: number }[] {
  return query<{ source: string; count: number }>(`
    SELECT COALESCE(source, 'Unknown') as source, COUNT(*) as count
    FROM contacts
    WHERE deleted_at IS NULL
    GROUP BY source
    ORDER BY count DESC
  `)
}

// Get contacts created this month
export function getContactsCreatedThisMonth(): number {
  const result = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM contacts 
    WHERE deleted_at IS NULL 
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `)
  return result?.count || 0
}

// Get unique companies
export function getUniqueCompanies(): string[] {
  const results = query<{ company: string }>(`
    SELECT DISTINCT company FROM contacts 
    WHERE deleted_at IS NULL AND company IS NOT NULL AND company != ''
    ORDER BY company ASC
  `)
  return results.map(r => r.company)
}

// Get unique sources
export function getUniqueSources(): string[] {
  const results = query<{ source: string }>(`
    SELECT DISTINCT source FROM contacts 
    WHERE deleted_at IS NULL AND source IS NOT NULL AND source != ''
    ORDER BY source ASC
  `)
  return results.map(r => r.source)
}

// Get unique locations
export function getUniqueLocations(): string[] {
  const results = query<{ location: string }>(`
    SELECT DISTINCT location FROM contacts 
    WHERE deleted_at IS NULL AND location IS NOT NULL AND location != ''
    ORDER BY location ASC
  `)
  return results.map(r => r.location)
}

// Filter parameters interface
interface ContactFilters {
  search?: string
  tags?: string[]
  companies?: string[]
  sources?: string[]
  locations?: string[]
  createdFrom?: string
  createdTo?: string
  lastContactFrom?: string
  lastContactTo?: string
  sortBy?: 'name' | 'company' | 'created_at' | 'last_contact_at' | 'updated_at'
  sortOrder?: 'asc' | 'desc'
}

// Get contacts with advanced filters
export function getContactsWithFilters(filters: ContactFilters): Contact[] {
  const conditions: string[] = ['c.deleted_at IS NULL']
  const params: unknown[] = []

  if (filters.search) {
    const pattern = `%${filters.search.toLowerCase()}%`
    conditions.push('(lower(c.name) LIKE ? OR lower(c.company) LIKE ? OR lower(c.title) LIKE ? OR lower(c.emails) LIKE ?)')
    params.push(pattern, pattern, pattern, pattern)
  }

  if (filters.companies && filters.companies.length > 0) {
    const placeholders = filters.companies.map(() => '?').join(', ')
    conditions.push(`c.company IN (${placeholders})`)
    params.push(...filters.companies)
  }

  if (filters.sources && filters.sources.length > 0) {
    const placeholders = filters.sources.map(() => '?').join(', ')
    conditions.push(`c.source IN (${placeholders})`)
    params.push(...filters.sources)
  }

  if (filters.locations && filters.locations.length > 0) {
    const placeholders = filters.locations.map(() => '?').join(', ')
    conditions.push(`c.location IN (${placeholders})`)
    params.push(...filters.locations)
  }

  if (filters.createdFrom) {
    conditions.push('date(c.created_at) >= date(?)')
    params.push(filters.createdFrom)
  }

  if (filters.createdTo) {
    conditions.push('date(c.created_at) <= date(?)')
    params.push(filters.createdTo)
  }

  if (filters.lastContactFrom) {
    conditions.push('date(c.last_contact_at) >= date(?)')
    params.push(filters.lastContactFrom)
  }

  if (filters.lastContactTo) {
    conditions.push('date(c.last_contact_at) <= date(?)')
    params.push(filters.lastContactTo)
  }

  let sql = `SELECT DISTINCT c.* FROM contacts c`

  if (filters.tags && filters.tags.length > 0) {
    sql += ` JOIN contact_tags ct ON c.id = ct.contact_id`
    const placeholders = filters.tags.map(() => '?').join(', ')
    conditions.push(`ct.tag_id IN (${placeholders})`)
    params.push(...filters.tags)
  }

  sql += ` WHERE ${conditions.join(' AND ')}`

  const sortColumn = filters.sortBy || 'updated_at'
  const sortOrder = filters.sortOrder || 'desc'
  sql += ` ORDER BY c.${sortColumn} ${sortOrder.toUpperCase()}`

  return query<Contact>(sql, params)
}

// Bulk delete contacts
export function bulkDeleteContacts(ids: string[]): number {
  if (ids.length === 0) return 0
  
  const now = new Date().toISOString()
  let count = 0
  
  transaction(() => {
    for (const id of ids) {
      run('UPDATE contacts SET deleted_at = ? WHERE id = ?', [now, id])
      count++
    }
  })
  
  return count
}

// Bulk add tag to contacts
export function bulkAddTagToContacts(contactIds: string[], tagId: string): number {
  if (contactIds.length === 0) return 0
  
  let count = 0
  
  transaction(() => {
    for (const contactId of contactIds) {
      run('INSERT OR IGNORE INTO contact_tags (contact_id, tag_id) VALUES (?, ?)', [contactId, tagId])
      count++
    }
  })
  
  return count
}

// Bulk remove tag from contacts
export function bulkRemoveTagFromContacts(contactIds: string[], tagId: string): number {
  if (contactIds.length === 0) return 0
  
  let count = 0
  
  transaction(() => {
    for (const contactId of contactIds) {
      run('DELETE FROM contact_tags WHERE contact_id = ? AND tag_id = ?', [contactId, tagId])
      count++
    }
  })
  
  return count
}
