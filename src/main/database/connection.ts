import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

// Simple JSON-based database for MVP (can be replaced with better-sqlite3 later)
interface Database {
  contacts: Record<string, any>
  interactions: Record<string, any>
  tags: Record<string, any>
  contact_tags: Array<{ contact_id: string; tag_id: string }>
  followups: Record<string, any>
  settings: Record<string, string>
  _meta: { version: number }
}

let db: Database | null = null
let dbPath: string = ''

const DEFAULT_DB: Database = {
  contacts: {},
  interactions: {},
  tags: {
    tag_investor: { id: 'tag_investor', name: 'Investor', color: '#10b981' },
    tag_hotlead: { id: 'tag_hotlead', name: 'Hot Lead', color: '#ef4444' },
    tag_community: { id: 'tag_community', name: 'Community', color: '#8b5cf6' },
    tag_partner: { id: 'tag_partner', name: 'Partner', color: '#f59e0b' },
    tag_friend: { id: 'tag_friend', name: 'Friend', color: '#3b82f6' }
  },
  contact_tags: [],
  followups: {},
  settings: { schema_version: '1' },
  _meta: { version: 1 }
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function saveDatabase(): void {
  if (db && dbPath) {
    writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
  }
}

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }

  dbPath = join(dataDir, 'vaultcrm.json')
  console.log('Database path:', dbPath)

  if (existsSync(dbPath)) {
    try {
      const content = readFileSync(dbPath, 'utf-8')
      db = JSON.parse(content)
      console.log('Database loaded from file')
    } catch (error) {
      console.error('Failed to load database, creating new one:', error)
      db = { ...DEFAULT_DB }
      saveDatabase()
    }
  } else {
    db = { ...DEFAULT_DB }
    saveDatabase()
    console.log('New database created')
  }

  console.log('Database initialized successfully')
}

export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db = null
    console.log('Database closed')
  }
}

export function getDatabasePath(): string {
  return dbPath
}

export function getDatabaseBuffer(): Buffer {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return Buffer.from(JSON.stringify(db, null, 2), 'utf-8')
}

// Helper functions for queries
export function getAllFromTable<T>(table: keyof Omit<Database, '_meta' | 'settings' | 'contact_tags'>): T[] {
  const data = getDatabase()[table] as Record<string, T>
  return Object.values(data)
}

export function getById<T>(table: keyof Omit<Database, '_meta' | 'settings' | 'contact_tags'>, id: string): T | null {
  const data = getDatabase()[table] as Record<string, T>
  return data[id] || null
}

export function insert<T extends { id: string }>(table: keyof Omit<Database, '_meta' | 'settings' | 'contact_tags'>, item: T): T {
  const data = getDatabase()[table] as Record<string, T>
  data[item.id] = item
  saveDatabase()
  return item
}

export function update<T extends { id: string }>(table: keyof Omit<Database, '_meta' | 'settings' | 'contact_tags'>, id: string, updates: Partial<T>): T | null {
  const data = getDatabase()[table] as Record<string, T>
  if (!data[id]) return null
  data[id] = { ...data[id], ...updates }
  saveDatabase()
  return data[id]
}

export function remove(table: keyof Omit<Database, '_meta' | 'settings' | 'contact_tags'>, id: string): void {
  const data = getDatabase()[table] as Record<string, any>
  delete data[id]
  saveDatabase()
}

export function getSetting(key: string): string | null {
  return getDatabase().settings[key] || null
}

export function setSetting(key: string, value: string): void {
  getDatabase().settings[key] = value
  saveDatabase()
}

export function getContactTags(): Array<{ contact_id: string; tag_id: string }> {
  return getDatabase().contact_tags
}

export function addContactTag(contact_id: string, tag_id: string): void {
  const db = getDatabase()
  const exists = db.contact_tags.some(ct => ct.contact_id === contact_id && ct.tag_id === tag_id)
  if (!exists) {
    db.contact_tags.push({ contact_id, tag_id })
    saveDatabase()
  }
}

export function removeContactTag(contact_id: string, tag_id: string): void {
  const db = getDatabase()
  db.contact_tags = db.contact_tags.filter(ct => !(ct.contact_id === contact_id && ct.tag_id === tag_id))
  saveDatabase()
}
