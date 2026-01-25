import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto'

let db: SqlJsDatabase | null = null
let dbPath: string = ''
let encryptionKey: Buffer | null = null

// File format constants
const MAGIC_BYTES = Buffer.from('VCDB') // VaultCRM Database
const FORMAT_VERSION = 1
const ALGORITHM = 'aes-256-gcm'
const SALT_LENGTH = 16
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const PBKDF2_ITERATIONS = 100000

// Header structure:
// [4 bytes: magic "VCDB"]
// [2 bytes: format version (uint16 BE)]
// [12 bytes: nonce/IV]
// [16 bytes: auth tag]
// [rest: ciphertext]
const HEADER_SIZE = 4 + 2 + IV_LENGTH + AUTH_TAG_LENGTH // 34 bytes

// Encrypt data with AES-256-GCM and versioned header
function encryptWithHeader(data: Buffer, key: Buffer): Buffer {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  
  // Build header
  const versionBuffer = Buffer.alloc(2)
  versionBuffer.writeUInt16BE(FORMAT_VERSION, 0)
  
  // Combine: magic + version + iv + authTag + ciphertext
  return Buffer.concat([MAGIC_BYTES, versionBuffer, iv, authTag, encrypted])
}

// Decrypt data with versioned header (also supports legacy format)
function decryptWithHeader(data: Buffer, key: Buffer): Buffer {
  // Check for magic bytes to determine format
  const hasMagic = data.subarray(0, 4).equals(MAGIC_BYTES)
  
  if (hasMagic) {
    // New versioned format
    const version = data.readUInt16BE(4)
    if (version !== FORMAT_VERSION) {
      throw new Error(`Unsupported database format version: ${version}`)
    }
    
    const iv = data.subarray(6, 6 + IV_LENGTH)
    const authTag = data.subarray(6 + IV_LENGTH, 6 + IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = data.subarray(HEADER_SIZE)
    
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  } else {
    // Legacy format (for backward compatibility)
    // Old format: [12 bytes IV][16 bytes authTag][ciphertext]
    console.log('Detected legacy database format, will upgrade on next save')
    const iv = data.subarray(0, IV_LENGTH)
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    return Buffer.concat([decipher.update(encrypted), decipher.final()])
  }
}

// Legacy encrypt function (for internal use only)
function encrypt(data: Buffer, key: Buffer): Buffer {
  return encryptWithHeader(data, key)
}

// Legacy decrypt function (for internal use only)
function decrypt(data: Buffer, key: Buffer): Buffer {
  return decryptWithHeader(data, key)
}

// Derive encryption key from password using PBKDF2
export function deriveKey(password: string, salt: Buffer): Buffer {
  return pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256')
}

// Generate a new salt
export function generateSalt(): Buffer {
  return randomBytes(SALT_LENGTH)
}

// Get database instance
export function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

// Save database to disk (encrypted)
export function saveDatabase(): void {
  if (!db || !dbPath || !encryptionKey) {
    console.warn('Cannot save: database not properly initialized')
    return
  }
  
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    const encrypted = encrypt(buffer, encryptionKey)
    
    // Atomic write: write to temp file first, then rename
    const tempPath = dbPath + '.tmp'
    writeFileSync(tempPath, encrypted)
    renameSync(tempPath, dbPath)
    
    console.log('Database saved successfully')
  } catch (error) {
    console.error('Failed to save database:', error)
    throw error
  }
}

// Initialize database with encryption key
export async function initDatabase(key: Buffer): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  
  dbPath = join(dataDir, 'vaultcrm.db')
  encryptionKey = key
  
  console.log('Database path:', dbPath)
  
  // Initialize sql.js
  const SQL = await initSqlJs()
  
  if (existsSync(dbPath)) {
    try {
      const encryptedData = readFileSync(dbPath)
      const decrypted = decrypt(encryptedData, key)
      db = new SQL.Database(decrypted)
      console.log('Database loaded and decrypted successfully')
    } catch (error) {
      console.error('Failed to decrypt database - wrong key or corrupted file:', error)
      throw new Error('DECRYPTION_FAILED')
    }
  } else {
    // Create new database
    db = new SQL.Database()
    runMigrations()
    saveDatabase()
    console.log('New encrypted database created')
  }
  
  // Run any pending migrations
  runMigrations()
  
  console.log('Database initialized successfully')
}

// Close database
export function closeDatabase(): void {
  if (db) {
    saveDatabase()
    db.close()
    db = null
    encryptionKey = null
    console.log('Database closed')
  }
}

// Get database path
export function getDatabasePath(): string {
  return dbPath
}

// Check if database exists
export function databaseExists(): boolean {
  const userDataPath = app.getPath('userData')
  const dataDir = join(userDataPath, 'data')
  return existsSync(join(dataDir, 'vaultcrm.db'))
}

// Export database as buffer (for backup) - PLAINTEXT, use exportEncryptedBuffer for secure export
export function exportDatabaseBuffer(): Buffer {
  if (!db) {
    throw new Error('Database not initialized')
  }
  return Buffer.from(db.export())
}

// Export database as encrypted buffer (for secure backup)
export function exportEncryptedBuffer(): Buffer {
  if (!db || !encryptionKey) {
    throw new Error('Database not initialized')
  }
  const data = Buffer.from(db.export())
  return encryptWithHeader(data, encryptionKey)
}

// Rekey the database with a new encryption key
export function rekeyDatabase(newKey: Buffer): void {
  if (!db || !dbPath) {
    throw new Error('Database not initialized')
  }
  
  // Export current data
  const data = Buffer.from(db.export())
  
  // Encrypt with new key
  const encrypted = encryptWithHeader(data, newKey)
  
  // Atomic write with new encryption
  const tempPath = dbPath + '.rekey.tmp'
  writeFileSync(tempPath, encrypted)
  renameSync(tempPath, dbPath)
  
  // Update current key
  encryptionKey = newKey
  
  console.log('Database rekeyed successfully')
}

// Get current encryption key (for backup purposes)
export function getCurrentKey(): Buffer | null {
  return encryptionKey
}

// Check if file has valid VaultCRM header
export function isValidDatabaseFile(filePath: string): { valid: boolean; version?: number; isLegacy?: boolean } {
  if (!existsSync(filePath)) {
    return { valid: false }
  }
  
  try {
    const data = readFileSync(filePath)
    if (data.length < HEADER_SIZE) {
      // Could be legacy format
      if (data.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1) {
        return { valid: true, isLegacy: true }
      }
      return { valid: false }
    }
    
    const hasMagic = data.subarray(0, 4).equals(MAGIC_BYTES)
    if (hasMagic) {
      const version = data.readUInt16BE(4)
      return { valid: true, version, isLegacy: false }
    }
    
    // Could be legacy format
    return { valid: true, isLegacy: true }
  } catch {
    return { valid: false }
  }
}

// Run database migrations
function runMigrations(): void {
  if (!db) return
  
  // Create migrations table if not exists
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)
  
  // Get applied migrations
  const appliedResult = db.exec('SELECT name FROM _migrations')
  const applied = new Set(appliedResult[0]?.values.map(v => v[0]) || [])
  
  // Define migrations
  const migrations: { name: string; sql: string }[] = [
    {
      name: '001_initial_schema',
      sql: `
        -- Contacts table
        CREATE TABLE IF NOT EXISTS contacts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          company TEXT,
          title TEXT,
          emails TEXT DEFAULT '[]',
          phones TEXT DEFAULT '[]',
          location TEXT,
          source TEXT,
          notes TEXT,
          last_contact_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          deleted_at TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);
        CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
        CREATE INDEX IF NOT EXISTS idx_contacts_deleted_at ON contacts(deleted_at);
        
        -- Tags table
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          color TEXT NOT NULL DEFAULT '#3b82f6',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        
        -- Contact-Tag junction table
        CREATE TABLE IF NOT EXISTS contact_tags (
          contact_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (contact_id, tag_id),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
        
        -- Interactions table
        CREATE TABLE IF NOT EXISTS interactions (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('note', 'call', 'meeting', 'email')),
          body TEXT NOT NULL,
          occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          deleted_at TEXT,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON interactions(contact_id);
        CREATE INDEX IF NOT EXISTS idx_interactions_occurred_at ON interactions(occurred_at);
        
        -- Follow-ups table
        CREATE TABLE IF NOT EXISTS followups (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          due_at TEXT NOT NULL,
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done', 'snoozed')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          done_at TEXT,
          deleted_at TEXT,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
        
        CREATE INDEX IF NOT EXISTS idx_followups_contact_id ON followups(contact_id);
        CREATE INDEX IF NOT EXISTS idx_followups_due_at ON followups(due_at);
        CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
        
        -- Settings table
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        
        -- Insert default settings
        INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_version', '1');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('storage_version', 'v1_sqlite');
        
        -- Insert default tags
        INSERT OR IGNORE INTO tags (id, name, color) VALUES ('tag_investor', 'Investor', '#10b981');
        INSERT OR IGNORE INTO tags (id, name, color) VALUES ('tag_hotlead', 'Hot Lead', '#ef4444');
        INSERT OR IGNORE INTO tags (id, name, color) VALUES ('tag_community', 'Community', '#8b5cf6');
        INSERT OR IGNORE INTO tags (id, name, color) VALUES ('tag_partner', 'Partner', '#f59e0b');
        INSERT OR IGNORE INTO tags (id, name, color) VALUES ('tag_friend', 'Friend', '#3b82f6');
      `
    },
    {
      name: '002_search_indexes',
      sql: `
        -- Additional indexes for faster search (FTS5 not available in sql.js WASM)
        CREATE INDEX IF NOT EXISTS idx_contacts_name_lower ON contacts(lower(name));
        CREATE INDEX IF NOT EXISTS idx_contacts_company_lower ON contacts(lower(company));
        CREATE INDEX IF NOT EXISTS idx_contacts_emails ON contacts(emails);
      `
    },
    {
      name: '003_enterprise_features',
      sql: `
        -- Pipelines table
        CREATE TABLE IF NOT EXISTS pipelines (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          stages TEXT NOT NULL DEFAULT '[]',
          is_default INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Deals table
        CREATE TABLE IF NOT EXISTS deals (
          id TEXT PRIMARY KEY,
          pipeline_id TEXT NOT NULL,
          contact_id TEXT,
          name TEXT NOT NULL,
          value REAL DEFAULT 0,
          currency TEXT DEFAULT 'USD',
          stage TEXT NOT NULL,
          probability INTEGER DEFAULT 50,
          expected_close TEXT,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          closed_at TEXT,
          won INTEGER,
          deleted_at TEXT,
          FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);
        CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);
        CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
        CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close);

        -- Tasks table
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          contact_id TEXT,
          deal_id TEXT,
          title TEXT NOT NULL,
          description TEXT,
          due_at TEXT,
          priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
          status TEXT DEFAULT 'open' CHECK(status IN ('open', 'done', 'cancelled')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT,
          deleted_at TEXT,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
          FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_deal ON tasks(deal_id);
        CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

        -- Custom field definitions table
        CREATE TABLE IF NOT EXISTS custom_field_definitions (
          id TEXT PRIMARY KEY,
          entity_type TEXT NOT NULL CHECK(entity_type IN ('contact', 'deal', 'task')),
          name TEXT NOT NULL,
          field_type TEXT NOT NULL CHECK(field_type IN ('text', 'number', 'date', 'select', 'multiselect', 'checkbox', 'url', 'email', 'phone')),
          options TEXT DEFAULT '[]',
          required INTEGER DEFAULT 0,
          sort_order INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entity ON custom_field_definitions(entity_type);

        -- Custom field values table
        CREATE TABLE IF NOT EXISTS custom_field_values (
          entity_id TEXT NOT NULL,
          field_id TEXT NOT NULL,
          value TEXT,
          PRIMARY KEY (entity_id, field_id),
          FOREIGN KEY (field_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);

        -- Automation rules table
        CREATE TABLE IF NOT EXISTS automation_rules (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          trigger_type TEXT NOT NULL CHECK(trigger_type IN ('tag_added', 'tag_removed', 'deal_stage_changed', 'contact_created', 'deal_created', 'followup_done', 'task_done')),
          trigger_config TEXT DEFAULT '{}',
          action_type TEXT NOT NULL CHECK(action_type IN ('add_tag', 'remove_tag', 'create_task', 'update_field', 'move_deal_stage', 'send_notification')),
          action_config TEXT DEFAULT '{}',
          enabled INTEGER DEFAULT 1,
          run_count INTEGER DEFAULT 0,
          last_run_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);
        CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);

        -- Email accounts table
        CREATE TABLE IF NOT EXISTS email_accounts (
          id TEXT PRIMARY KEY,
          provider TEXT NOT NULL CHECK(provider IN ('gmail', 'outlook')),
          email TEXT NOT NULL UNIQUE,
          sync_enabled INTEGER DEFAULT 1,
          sync_emails INTEGER DEFAULT 1,
          sync_calendar INTEGER DEFAULT 1,
          last_email_sync_at TEXT,
          last_calendar_sync_at TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Synced emails table
        CREATE TABLE IF NOT EXISTS synced_emails (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          contact_id TEXT,
          message_id TEXT NOT NULL,
          thread_id TEXT,
          subject TEXT,
          snippet TEXT,
          from_addr TEXT,
          to_addr TEXT,
          date TEXT NOT NULL,
          is_read INTEGER DEFAULT 0,
          is_sent INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_synced_emails_account ON synced_emails(account_id);
        CREATE INDEX IF NOT EXISTS idx_synced_emails_contact ON synced_emails(contact_id);
        CREATE INDEX IF NOT EXISTS idx_synced_emails_date ON synced_emails(date);

        -- Calendar events table
        CREATE TABLE IF NOT EXISTS calendar_events (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL,
          contact_id TEXT,
          event_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          start_at TEXT NOT NULL,
          end_at TEXT NOT NULL,
          location TEXT,
          attendees TEXT DEFAULT '[]',
          is_all_day INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (account_id) REFERENCES email_accounts(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
        );

        CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON calendar_events(contact_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);

        -- Email templates table
        CREATE TABLE IF NOT EXISTS email_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          subject TEXT NOT NULL,
          body TEXT NOT NULL,
          variables TEXT DEFAULT '[]',
          usage_count INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Sequences table
        CREATE TABLE IF NOT EXISTS sequences (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          steps TEXT NOT NULL DEFAULT '[]',
          active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Sequence enrollments table
        CREATE TABLE IF NOT EXISTS sequence_enrollments (
          id TEXT PRIMARY KEY,
          sequence_id TEXT NOT NULL,
          contact_id TEXT NOT NULL,
          current_step INTEGER DEFAULT 0,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled')),
          next_action_at TEXT,
          started_at TEXT NOT NULL DEFAULT (datetime('now')),
          completed_at TEXT,
          FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);
        CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact ON sequence_enrollments(contact_id);
        CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status);

        -- Create default pipeline
        INSERT OR IGNORE INTO pipelines (id, name, stages, is_default) VALUES (
          'pipeline_default',
          'Sales Pipeline',
          '[{"id":"lead","name":"Lead","color":"#6366f1","order":0},{"id":"qualified","name":"Qualified","color":"#8b5cf6","order":1},{"id":"proposal","name":"Proposal","color":"#f59e0b","order":2},{"id":"negotiation","name":"Negotiation","color":"#ef4444","order":3},{"id":"closed_won","name":"Closed Won","color":"#10b981","order":4},{"id":"closed_lost","name":"Closed Lost","color":"#6b7280","order":5}]',
          1
        );

        -- Update schema version
        INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', '2');
      `
    }
  ]
  
  // Apply pending migrations
  for (const migration of migrations) {
    if (!applied.has(migration.name)) {
      console.log(`Applying migration: ${migration.name}`)
      try {
        db.exec(migration.sql)
        db.run('INSERT INTO _migrations (name) VALUES (?)', [migration.name])
        console.log(`Migration ${migration.name} applied successfully`)
      } catch (error) {
        console.error(`Failed to apply migration ${migration.name}:`, error)
        throw error
      }
    }
  }
}

// Execute a query and return results
export function query<T>(sql: string, params: (string | number | null | boolean | Uint8Array)[] = []): T[] {
  const db = getDb()
  const stmt = db.prepare(sql)
  stmt.bind(params as (string | number | null | Uint8Array)[])
  
  const results: T[] = []
  while (stmt.step()) {
    const row = stmt.getAsObject() as T
    results.push(row)
  }
  stmt.free()
  
  return results
}

// Execute a query and return first result
export function queryOne<T>(sql: string, params: (string | number | null | boolean | Uint8Array)[] = []): T | null {
  const results = query<T>(sql, params)
  return results[0] || null
}

// Run a statement (INSERT, UPDATE, DELETE)
export function run(sql: string, params: (string | number | null | boolean | Uint8Array)[] = []): { changes: number; lastInsertRowid: number } {
  const db = getDb()
  db.run(sql, params as (string | number | null | Uint8Array)[])
  
  // Get changes count
  const changesResult = db.exec('SELECT changes()')
  const changes = changesResult[0]?.values[0]?.[0] as number || 0
  
  // Get last insert rowid
  const rowidResult = db.exec('SELECT last_insert_rowid()')
  const lastInsertRowid = rowidResult[0]?.values[0]?.[0] as number || 0
  
  saveDatabase()
  
  return { changes, lastInsertRowid }
}

// Transaction helper
export function transaction<T>(fn: () => T): T {
  const db = getDb()
  db.run('BEGIN TRANSACTION')
  try {
    const result = fn()
    db.run('COMMIT')
    saveDatabase()
    return result
  } catch (error) {
    db.run('ROLLBACK')
    throw error
  }
}
