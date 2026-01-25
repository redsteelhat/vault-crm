import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, renameSync, mkdirSync } from 'fs'
import { run, transaction, saveDatabase } from '../sqlite/connection'

interface LegacyDatabase {
  contacts: Record<string, LegacyContact>
  interactions: Record<string, LegacyInteraction>
  tags: Record<string, LegacyTag>
  contact_tags: Array<{ contact_id: string; tag_id: string }>
  followups: Record<string, LegacyFollowup>
  settings: Record<string, string>
  _meta: { version: number }
}

interface LegacyContact {
  id: string
  name: string
  company?: string | null
  title?: string | null
  emails?: string
  phones?: string
  location?: string | null
  source?: string | null
  notes?: string | null
  last_contact_at?: string | null
  created_at: string
  updated_at: string
}

interface LegacyInteraction {
  id: string
  contact_id: string
  type: string
  body: string
  occurred_at: string
  created_at: string
}

interface LegacyTag {
  id: string
  name: string
  color: string
}

interface LegacyFollowup {
  id: string
  contact_id: string
  due_at: string
  reason?: string | null
  status: string
  created_at: string
  done_at?: string | null
}

export interface MigrationResult {
  success: boolean
  error?: string
  stats?: {
    contacts: number
    interactions: number
    tags: number
    contactTags: number
    followups: number
  }
}

// Check if legacy JSON database exists
export function legacyDatabaseExists(): boolean {
  const userDataPath = app.getPath('userData')
  const jsonPath = join(userDataPath, 'data', 'vaultcrm.json')
  return existsSync(jsonPath)
}

// Load legacy JSON database
function loadLegacyDatabase(): LegacyDatabase | null {
  const userDataPath = app.getPath('userData')
  const jsonPath = join(userDataPath, 'data', 'vaultcrm.json')
  
  if (!existsSync(jsonPath)) {
    return null
  }
  
  try {
    const content = readFileSync(jsonPath, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    console.error('Failed to load legacy database:', error)
    return null
  }
}

// Archive legacy JSON database
function archiveLegacyDatabase(): void {
  const userDataPath = app.getPath('userData')
  const jsonPath = join(userDataPath, 'data', 'vaultcrm.json')
  const archiveDir = join(userDataPath, 'data', 'archive')
  
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true })
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const archivePath = join(archiveDir, `vaultcrm-${timestamp}.json`)
  
  renameSync(jsonPath, archivePath)
  console.log('Legacy database archived to:', archivePath)
}

// Migrate data from JSON to SQLite
export function migrateFromJson(): MigrationResult {
  const legacy = loadLegacyDatabase()
  
  if (!legacy) {
    return {
      success: false,
      error: 'No legacy database found'
    }
  }
  
  console.log('Starting migration from JSON to SQLite...')
  
  const stats = {
    contacts: 0,
    interactions: 0,
    tags: 0,
    contactTags: 0,
    followups: 0
  }
  
  try {
    transaction(() => {
      // Migrate tags (skip defaults already created)
      const tags = Object.values(legacy.tags || {})
      for (const tag of tags) {
        try {
          run(`
            INSERT OR IGNORE INTO tags (id, name, color)
            VALUES (?, ?, ?)
          `, [tag.id, tag.name, tag.color])
          stats.tags++
        } catch (e) {
          console.warn('Tag migration skipped:', tag.id, e)
        }
      }
      
      // Migrate contacts
      const contacts = Object.values(legacy.contacts || {})
      for (const contact of contacts) {
        try {
          run(`
            INSERT INTO contacts (id, name, company, title, emails, phones, location, source, notes, last_contact_at, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            contact.id,
            contact.name,
            contact.company || null,
            contact.title || null,
            contact.emails || '[]',
            contact.phones || '[]',
            contact.location || null,
            contact.source || null,
            contact.notes || null,
            contact.last_contact_at || null,
            contact.created_at,
            contact.updated_at
          ])
          stats.contacts++
        } catch (e) {
          console.warn('Contact migration failed:', contact.id, e)
        }
      }
      
      // Migrate contact_tags
      const contactTags = legacy.contact_tags || []
      for (const ct of contactTags) {
        try {
          run(`
            INSERT OR IGNORE INTO contact_tags (contact_id, tag_id)
            VALUES (?, ?)
          `, [ct.contact_id, ct.tag_id])
          stats.contactTags++
        } catch (e) {
          console.warn('Contact-tag migration skipped:', ct, e)
        }
      }
      
      // Migrate interactions
      const interactions = Object.values(legacy.interactions || {})
      for (const interaction of interactions) {
        try {
          run(`
            INSERT INTO interactions (id, contact_id, type, body, occurred_at, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            interaction.id,
            interaction.contact_id,
            interaction.type,
            interaction.body,
            interaction.occurred_at,
            interaction.created_at
          ])
          stats.interactions++
        } catch (e) {
          console.warn('Interaction migration failed:', interaction.id, e)
        }
      }
      
      // Migrate followups
      const followups = Object.values(legacy.followups || {})
      for (const followup of followups) {
        try {
          run(`
            INSERT INTO followups (id, contact_id, due_at, reason, status, created_at, done_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [
            followup.id,
            followup.contact_id,
            followup.due_at,
            followup.reason || null,
            followup.status || 'open',
            followup.created_at,
            followup.done_at || null
          ])
          stats.followups++
        } catch (e) {
          console.warn('Followup migration failed:', followup.id, e)
        }
      }
      
      // Update storage version
      run(`
        INSERT INTO settings (key, value) VALUES ('storage_version', 'v1_sqlite')
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `)
    })
    
    // Save and archive
    saveDatabase()
    archiveLegacyDatabase()
    
    console.log('Migration complete:', stats)
    
    return {
      success: true,
      stats
    }
  } catch (error) {
    console.error('Migration failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get migration status
export function getMigrationStatus(): 'not_needed' | 'pending' | 'completed' {
  if (!legacyDatabaseExists()) {
    return 'not_needed'
  }
  
  // Check if SQLite db exists and has data
  const userDataPath = app.getPath('userData')
  const sqlitePath = join(userDataPath, 'data', 'vaultcrm.db')
  
  if (existsSync(sqlitePath)) {
    return 'completed'
  }
  
  return 'pending'
}
