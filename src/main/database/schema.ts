import type { Database } from 'sql.js'

const SCHEMA_VERSION = 2

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
        ['schema_version', '1']
      )
    },

    // Migration 2: Enterprise features - Pipelines, Deals, Tasks, Custom Fields, Automations
    () => {
      // Pipelines table
      db.run(`
        CREATE TABLE IF NOT EXISTS pipelines (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          stages TEXT NOT NULL DEFAULT '[]',
          is_default INTEGER DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      // Deals table
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON deals(pipeline_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_deals_contact ON deals(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_deals_expected_close ON deals(expected_close);`)

      // Tasks table
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_deal ON tasks(deal_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`)

      // Custom field definitions table
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_custom_field_defs_entity ON custom_field_definitions(entity_type);`)

      // Custom field values table
      db.run(`
        CREATE TABLE IF NOT EXISTS custom_field_values (
          entity_id TEXT NOT NULL,
          field_id TEXT NOT NULL,
          value TEXT,
          PRIMARY KEY (entity_id, field_id),
          FOREIGN KEY (field_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE
        );
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);`)

      // Automation rules table
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_type);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_automation_rules_enabled ON automation_rules(enabled);`)

      // Email accounts table (for Faz 2)
      db.run(`
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
      `)

      // Synced emails table (for Faz 2)
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_synced_emails_account ON synced_emails(account_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_synced_emails_contact ON synced_emails(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_synced_emails_date ON synced_emails(date);`)

      // Calendar events table (for Faz 2)
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_account ON calendar_events(account_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_contact ON calendar_events(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);`)

      // Email templates table (for Faz 2)
      db.run(`
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
      `)

      // Sequences table (for Faz 2)
      db.run(`
        CREATE TABLE IF NOT EXISTS sequences (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          steps TEXT NOT NULL DEFAULT '[]',
          active INTEGER DEFAULT 1,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `)

      // Sequence enrollments table (for Faz 2)
      db.run(`
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
      `)

      db.run(`CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_sequence ON sequence_enrollments(sequence_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_contact ON sequence_enrollments(contact_id);`)
      db.run(`CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status ON sequence_enrollments(status);`)

      // Add soft delete column to contacts if not exists
      db.run(`ALTER TABLE contacts ADD COLUMN deleted_at TEXT;`)

      // Create default pipeline
      const defaultPipelineId = 'pipeline_default'
      const defaultStages = JSON.stringify([
        { id: 'lead', name: 'Lead', color: '#6366f1', order: 0 },
        { id: 'qualified', name: 'Qualified', color: '#8b5cf6', order: 1 },
        { id: 'proposal', name: 'Proposal', color: '#f59e0b', order: 2 },
        { id: 'negotiation', name: 'Negotiation', color: '#ef4444', order: 3 },
        { id: 'closed_won', name: 'Closed Won', color: '#10b981', order: 4 },
        { id: 'closed_lost', name: 'Closed Lost', color: '#6b7280', order: 5 }
      ])

      db.run(
        'INSERT OR IGNORE INTO pipelines (id, name, stages, is_default) VALUES (?, ?, ?, ?)',
        [defaultPipelineId, 'Sales Pipeline', defaultStages, 1]
      )

      // Update schema version
      db.run(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['schema_version', '2']
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
