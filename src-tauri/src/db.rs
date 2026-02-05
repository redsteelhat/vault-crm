// SQLite connection and schema — local-only, no cloud.
// Encryption (SQLCipher / at-rest) can be added later; MVP uses plain SQLite in app data dir.

use rusqlite::{params, Connection, Result as SqlResult};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Option<Connection>>);

fn app_data_dir(app: &AppHandle) -> std::io::Result<PathBuf> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    std::fs::create_dir_all(&app_data)?;
    Ok(app_data)
}

pub fn init_db(app: &AppHandle) -> SqlResult<Connection> {
    let app_data = app_data_dir(app).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
    let path = app_data.join("vault.db");
    let conn = Connection::open(&path)?;
    init_schema(&conn)?;
    init_settings(&conn, &app_data)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "
        -- App settings (key/value)
        CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Tags (e.g. Investors, Customers, LPs)
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Companies (şirket kartı — A1.5)
        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL DEFAULT '',
            domain TEXT,
            industry TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Contacts (kişi kartı)
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            first_name TEXT NOT NULL DEFAULT '',
            last_name TEXT NOT NULL DEFAULT '',
            title TEXT,
            company TEXT,
            city TEXT,
            country TEXT,
            email TEXT,
            phone TEXT,
            linkedin_url TEXT,
            twitter_url TEXT,
            website TEXT,
            email_secondary TEXT,
            phone_secondary TEXT,
            company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
            notes TEXT,
            last_touched_at TEXT,
            next_touch_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Custom fields (A3: tanımlanabilir alanlar)
        CREATE TABLE IF NOT EXISTS custom_fields (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            kind TEXT NOT NULL DEFAULT 'text',
            options TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Contact custom values (field_id -> value)
        CREATE TABLE IF NOT EXISTS contact_custom_values (
            contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
            field_id TEXT NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
            value TEXT,
            PRIMARY KEY (contact_id, field_id)
        );

        -- Contact <-> Tag (many-to-many)
        CREATE TABLE IF NOT EXISTS contact_tags (
            contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
            tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (contact_id, tag_id)
        );

        -- Notes (kişi/şirket bazlı; template: Meeting Notes, Follow-up, Intro)
        CREATE TABLE IF NOT EXISTS notes (
            id TEXT PRIMARY KEY,
            contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
            kind TEXT NOT NULL DEFAULT 'note',
            title TEXT,
            body TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Reminders (next action, snooze, recurring)
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
            note_id TEXT REFERENCES notes(id) ON DELETE SET NULL,
            title TEXT NOT NULL,
            due_at TEXT NOT NULL,
            snooze_until TEXT,
            recurring_days INTEGER,
            completed_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Interactions (meeting, call, email, DM) for timeline
        CREATE TABLE IF NOT EXISTS interactions (
            id TEXT PRIMARY KEY,
            contact_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
            kind TEXT NOT NULL,
            happened_at TEXT NOT NULL,
            summary TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        -- Attachments (A6)
        CREATE TABLE IF NOT EXISTS attachments (
            id TEXT PRIMARY KEY,
            owner_type TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            file_name TEXT NOT NULL,
            mime TEXT,
            size INTEGER,
            storage_path TEXT NOT NULL,
            encrypted INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_attachments_owner ON attachments(owner_type, owner_id);

        -- FTS5 full-text search (contacts + notes)
        CREATE VIRTUAL TABLE IF NOT EXISTS contacts_fts USING fts5(
            first_name, last_name, company, notes,
            content='contacts',
            content_rowid='rowid'
        );
        CREATE TRIGGER IF NOT EXISTS contacts_fts_insert AFTER INSERT ON contacts BEGIN
            INSERT INTO contacts_fts(rowid, first_name, last_name, company, notes)
            VALUES (new.rowid, new.first_name, new.last_name, new.company, new.notes);
        END;
        CREATE TRIGGER IF NOT EXISTS contacts_fts_update AFTER UPDATE ON contacts BEGIN
            INSERT INTO contacts_fts(contacts_fts, rowid, first_name, last_name, company, notes)
            VALUES ('delete', old.rowid, old.first_name, old.last_name, old.company, old.notes);
            INSERT INTO contacts_fts(rowid, first_name, last_name, company, notes)
            VALUES (new.rowid, new.first_name, new.last_name, new.company, new.notes);
        END;
        CREATE TRIGGER IF NOT EXISTS contacts_fts_delete AFTER DELETE ON contacts BEGIN
            INSERT INTO contacts_fts(contacts_fts, rowid, first_name, last_name, company, notes)
            VALUES ('delete', old.rowid, old.first_name, old.last_name, old.company, old.notes);
        END;
        ",
    )?;
    // Migration: add new columns to contacts if missing (existing DBs)
    let alter_columns = [
        "ALTER TABLE contacts ADD COLUMN twitter_url TEXT",
        "ALTER TABLE contacts ADD COLUMN email_secondary TEXT",
        "ALTER TABLE contacts ADD COLUMN phone_secondary TEXT",
        "ALTER TABLE contacts ADD COLUMN company_id TEXT",
    ];
    for sql in alter_columns {
        if conn.execute(sql, []).is_err() {
            // Column may already exist; ignore
        }
    }
    seed_default_custom_fields(conn)?;
    Ok(())
}

fn init_settings(conn: &Connection, app_data: &Path) -> SqlResult<()> {
    let app_data_str = app_data.to_string_lossy().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('app_data_dir', ?1)",
        params![app_data_str],
    )?;
    let attachments_dir = app_data.join("attachments");
    let _ = std::fs::create_dir_all(&attachments_dir);
    let attachments_str = attachments_dir.to_string_lossy().to_string();
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (key, value) VALUES ('attachments_dir', ?1)",
        params![attachments_str],
    )?;
    Ok(())
}

fn seed_default_custom_fields(conn: &Connection) -> SqlResult<()> {
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM custom_fields",
        [],
        |r| r.get(0),
    ).unwrap_or(0);
    if count > 0 {
        return Ok(());
    }
    let now = "2024-01-01T00:00:00Z";
    conn.execute(
        "INSERT INTO custom_fields (id, name, kind, options, sort_order, created_at) VALUES 
         ('cf_warmth', 'Warmth score', 'single_select', '[\"1\",\"2\",\"3\",\"4\",\"5\"]', 0, ?1),
         ('cf_source', 'Source', 'single_select', '[\"LinkedIn\",\"Referral\",\"Event\",\"Cold\",\"Other\"]', 1, ?2),
         ('cf_stage', 'Stage', 'single_select', '[\"Lead\",\"Qualified\",\"Proposal\",\"Negotiation\",\"Closed Won\",\"Closed Lost\"]', 2, ?3)",
        params![now, now, now],
    )?;
    Ok(())
}
