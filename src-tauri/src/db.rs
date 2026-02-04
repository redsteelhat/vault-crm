// SQLite connection and schema — local-only, no cloud.
// Encryption (SQLCipher / at-rest) can be added later; MVP uses plain SQLite in app data dir.

use rusqlite::{Connection, Result as SqlResult};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::AppHandle;

pub struct DbState(pub Mutex<Option<Connection>>);

fn app_data_db_path(app: &AppHandle) -> std::io::Result<PathBuf> {
    let app_data = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data)?;
    Ok(app_data.join("vault.db"))
}

pub fn init_db(app: &AppHandle) -> SqlResult<Connection> {
    let path = app_data_db_path(app).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;
    let conn = Connection::open(&path)?;
    init_schema(&conn)?;
    Ok(conn)
}

fn init_schema(conn: &Connection) -> SqlResult<()> {
    conn.execute_batch(
        "
        -- Tags (e.g. Investors, Customers, LPs)
        CREATE TABLE IF NOT EXISTS tags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            color TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
            website TEXT,
            notes TEXT,
            last_touched_at TEXT,
            next_touch_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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
    Ok(())
}
