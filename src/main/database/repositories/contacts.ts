import { v4 as uuid } from 'uuid'
import { getAllFromTable, getById, insert, update, remove, getContactTags, addContactTag, removeContactTag, getDatabase, saveDatabase } from '../connection'
import type { Contact, Tag } from '../types'

export function getAllContacts(): Contact[] {
  return getAllFromTable<Contact>('contacts').sort((a, b) => a.name.localeCompare(b.name))
}

export function getContactById(id: string): Contact | null {
  return getById<Contact>('contacts', id)
}

export function createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Contact {
  const now = new Date().toISOString()
  const contact: Contact = {
    id: `contact_${uuid()}`,
    name: data.name,
    company: data.company || null,
    title: data.title || null,
    emails: data.emails || '[]',
    phones: data.phones || '[]',
    location: data.location || null,
    source: data.source || null,
    notes: data.notes || null,
    last_contact_at: data.last_contact_at || null,
    created_at: now,
    updated_at: now
  }
  return insert('contacts', contact)
}

export function updateContact(id: string, data: Partial<Contact>): Contact {
  const now = new Date().toISOString()
  const updated = update<Contact>('contacts', id, { ...data, updated_at: now })
  if (!updated) throw new Error('Contact not found')
  return updated
}

export function deleteContact(id: string): void {
  // Also remove related data
  const db = getDatabase()
  db.contact_tags = db.contact_tags.filter(ct => ct.contact_id !== id)
  
  // Remove interactions
  Object.keys(db.interactions).forEach(key => {
    if (db.interactions[key].contact_id === id) {
      delete db.interactions[key]
    }
  })
  
  // Remove followups
  Object.keys(db.followups).forEach(key => {
    if (db.followups[key].contact_id === id) {
      delete db.followups[key]
    }
  })
  
  remove('contacts', id)
}

export function searchContacts(query: string): Contact[] {
  if (!query.trim()) return getAllContacts()
  
  const q = query.toLowerCase()
  return getAllContacts().filter(c => 
    c.name.toLowerCase().includes(q) ||
    (c.company && c.company.toLowerCase().includes(q)) ||
    (c.title && c.title.toLowerCase().includes(q)) ||
    (c.notes && c.notes.toLowerCase().includes(q))
  )
}

export function getContactsByTag(tagId: string): Contact[] {
  const contactIds = getContactTags()
    .filter(ct => ct.tag_id === tagId)
    .map(ct => ct.contact_id)
  
  return getAllContacts().filter(c => contactIds.includes(c.id))
}

export function addTagToContact(contactId: string, tagId: string): void {
  addContactTag(contactId, tagId)
}

export function removeTagFromContact(contactId: string, tagId: string): void {
  removeContactTag(contactId, tagId)
}

export function getContactTags_(contactId: string): Tag[] {
  const tagIds = getContactTags()
    .filter(ct => ct.contact_id === contactId)
    .map(ct => ct.tag_id)
  
  return getAllFromTable<Tag>('tags').filter(t => tagIds.includes(t.id))
}

export function checkDuplicateByEmail(email: string): Contact | null {
  const contacts = getAllContacts()
  const emailLower = email.toLowerCase()
  
  for (const contact of contacts) {
    try {
      const emails = JSON.parse(contact.emails)
      if (Array.isArray(emails) && emails.some((e: string) => e.toLowerCase() === emailLower)) {
        return contact
      }
    } catch {
      // Invalid JSON, skip
    }
  }
  return null
}

export function getStaleContacts(days: number): Contact[] {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const cutoff = cutoffDate.toISOString()
  
  return getAllContacts().filter(c => 
    !c.last_contact_at || c.last_contact_at < cutoff
  )
}

export function getRecentContacts(limit: number = 10): Contact[] {
  return getAllContacts()
    .filter(c => c.last_contact_at)
    .sort((a, b) => (b.last_contact_at || '').localeCompare(a.last_contact_at || ''))
    .slice(0, limit)
}

export function getContactCount(): number {
  return getAllContacts().length
}
