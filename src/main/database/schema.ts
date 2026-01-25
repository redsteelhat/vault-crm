import type { Database } from 'sql.js'

const SCHEMA_VERSION = 1

export function initializeSchema(db: Database): void {
  // Create settings table first for version tracking
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Check current version
  const versionResult = db.exec("SELECT value FROM settings WHERE key = 'schema_version'")
  const currentVersion = versionResult.length > 0 && versionResult[0].values.length > 0
    ? parseInt(versionResult[0].values[0][0] as string, 10)
    : 0

  if (currentVersion < SCHEMA_VERSION) {
    runMigrations(db, currentVersion)
  }
}

function runMigrations(db: Database, fromVersion: number): void {
  const migrations: (() => void)[] = [
    // Migration 1: Initial schema
    () => {
      db.run(`
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
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_contacts_last_contact ON contacts(last_contact_at);`)

      db.run(`
        -- Tags table
        CREATE TABLE IF NOT EXISTS tags (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          color TEXT NOT NULL DEFAULT '#6366f1'
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);`)

      db.run(`
        -- Contact-Tag junction table
        CREATE TABLE IF NOT EXISTS contact_tags (
          contact_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          PRIMARY KEY (contact_id, tag_id),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON contact_tags(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);`)

      db.run(`
        -- Interactions table
        CREATE TABLE IF NOT EXISTS interactions (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('note', 'call', 'meeting', 'email')),
          body TEXT NOT NULL,
          occurred_at TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON interactions(occurred_at);`)

      db.run(`
        -- Follow-ups table
        CREATE TABLE IF NOT EXISTS followups (
          id TEXT PRIMARY KEY,
          contact_id TEXT NOT NULL,
          due_at TEXT NOT NULL,
          reason TEXT,
          status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done', 'snoozed')),
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          done_at TEXT,
          FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_followups_contact ON followups(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_followups_due ON followups(due_at);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);`)

      // Insert default tags
      const defaultTags = [
        { id: 'tag_investor', name: 'Investor', color: '#10b981' },
        { id: 'tag_hotlead', name: 'Hot Lead', color: '#ef4444' },
        { id: 'tag_community', name: 'Community', color: '#8b5cf6' },
        { id: 'tag_partner', name: 'Partner', color: '#f59e0b' },
        { id: 'tag_friend', name: 'Friend', color: '#3b82f6' }
      ]

      for (const tag of defaultTags) {
        db.run(
          'INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)',
          [tag.id, tag.name, tag.color]
        )
      }

      // Update schema version
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['schema_version', SCHEMA_VERSION.toString()]
      )
    }
  ]

  // Run migrations from current version
  for (let i = fromVersion; i < migrations.length; i++) {
    console.log(`Running migration ${i + 1}...`)
    migrations[i]()
  }

  console.log(`Database migrated to version ${SCHEMA_VERSION}`)
}
