// Core data types for VaultCRM

export interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  emails: string // JSON array
  phones: string // JSON array
  location: string | null
  source: string | null
  notes: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface ContactWithTags extends Contact {
  tags: Tag[]
}

export interface Interaction {
  id: string
  contact_id: string
  type: 'note' | 'call' | 'meeting' | 'email'
  body: string
  occurred_at: string
  created_at: string
}

export interface InteractionWithContact extends Interaction {
  contact_name: string
  contact_company: string | null
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface ContactTag {
  contact_id: string
  tag_id: string
}

export interface FollowUp {
  id: string
  contact_id: string
  due_at: string
  reason: string | null
  status: 'open' | 'done' | 'snoozed'
  created_at: string
  done_at: string | null
}

export interface FollowUpWithContact extends FollowUp {
  contact_name: string
  contact_company: string | null
}

export interface Settings {
  key: string
  value: string
}

// Import/Export types
export interface CsvMapping {
  name: string
  email?: string
  company?: string
  title?: string
  phone?: string
  location?: string
  source?: string
  notes?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
}
