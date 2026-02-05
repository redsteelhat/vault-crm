// SQLite connection and schema — local-only, no cloud.
// F1.1: At-rest encryption — DB file encrypted with key from OS keychain (F1.2).

use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use argon2::Argon2;
use base64::{engine::general_purpose, Engine as _};
use rand::rngs::OsRng;
use rand::RngCore;
use rusqlite::{params, Connection, Result as SqlResult};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

const KEYRING_SERVICE: &str = "VaultCRM";
const KEYRING_ENTRY: &str = "db_master_key";
const VAULT_DB: &str = "vault.db";
const VAULT_DB_ENCRYPTED: &str = "vault.db.encrypted";
const VAULT_DB_TMP: &str = "vault.db.tmp";

/// F1.2: Key in OS keychain (Windows Credential Manager, macOS Keychain, Linux Secret Service).
fn get_db_key() -> Result<Option<Vec<u8>>, String> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ENTRY).map_err(|e| e.to_string())?;
    let password = match entry.get_password() {
        Ok(p) => p,
        Err(_) => return Ok(None), // no entry yet
    };
    let bytes = general_purpose::STANDARD.decode(password.as_bytes()).map_err(|e| e.to_string())?;
    if bytes.len() != 32 {
        return Ok(None);
    }
    Ok(Some(bytes))
}

fn set_db_key(key: &[u8]) -> Result<(), String> {
    let encoded = general_purpose::STANDARD.encode(key);
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_ENTRY).map_err(|e| e.to_string())?;
    entry.set_password(&encoded).map_err(|e| e.to_string())?;
    Ok(())
}

/// Derive 32-byte key from passphrase (F1.3).
fn derive_key(passphrase: &str) -> Result<Vec<u8>, String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(passphrase.as_bytes(), b"vaultcrm_db_salt", &mut key)
        .map_err(|e| e.to_string())?;
    Ok(key.to_vec())
}

fn encrypt_file(key: &[u8], plaintext: &[u8]) -> Result<Vec<u8>, String> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    let ciphertext = cipher.encrypt(nonce, plaintext).map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(12 + ciphertext.len());
    out.extend_from_slice(&nonce_bytes);
    out.extend_from_slice(&ciphertext);
    Ok(out)
}

fn decrypt_file(key: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    if ciphertext.len() < 12 {
        return Err("Encrypted payload too short".to_string());
    }
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(&ciphertext[..12]);
    cipher.decrypt(nonce, &ciphertext[12..]).map_err(|e| e.to_string())
}

pub struct DbState(pub Mutex<Option<Connection>>);

/// Paths for encrypted DB flush (temp + encrypted file).
pub struct EncryptedPathsState(pub Mutex<Option<(PathBuf, PathBuf)>>);

/// F1.3: When Some(reason), frontend must show setup; when None, DB is ready.
pub struct EncryptionSetupState(pub Mutex<Option<SetupReason>>);

/// F1.3: Reason for setup screen.
#[derive(Clone, Debug, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SetupReason {
    FirstRun,
    MigratePlain,
}

#[derive(Debug)]
pub enum InitDbError {
    NeedSetup(SetupReason),
    Other(String),
}

impl std::fmt::Display for InitDbError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InitDbError::NeedSetup(r) => write!(f, "NeedSetup({:?})", r),
            InitDbError::Other(s) => write!(f, "{}", s),
        }
    }
}

fn app_data_dir(app: &AppHandle) -> std::io::Result<PathBuf> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))?;
    std::fs::create_dir_all(&app_data)?;
    Ok(app_data)
}

/// Opens DB: if key exists and vault.db.encrypted exists, decrypt to temp and open.
/// If no key: FirstRun (no files) or MigratePlain (vault.db exists).
pub fn init_db(app: &AppHandle) -> Result<(Connection, Option<(PathBuf, PathBuf)>), InitDbError> {
    let app_data = app_data_dir(app).map_err(|e| InitDbError::Other(e.to_string()))?;
    let path_plain = app_data.join(VAULT_DB);
    let path_encrypted = app_data.join(VAULT_DB_ENCRYPTED);
    let path_tmp = app_data.join(VAULT_DB_TMP);

    let key = get_db_key().map_err(|e| InitDbError::Other(e))?;

    if let Some(key) = key {
        // Key exists — use encrypted DB.
        if path_encrypted.exists() {
            let ciphertext = std::fs::read(&path_encrypted).map_err(|e| InitDbError::Other(e.to_string()))?;
            let plaintext = decrypt_file(&key, &ciphertext).map_err(|e| InitDbError::Other(e))?;
            std::fs::write(&path_tmp, &plaintext).map_err(|e| InitDbError::Other(e.to_string()))?;
            let conn = Connection::open(&path_tmp).map_err(|e| InitDbError::Other(e.to_string()))?;
            return Ok((conn, Some((path_tmp, path_encrypted))));
        }
        // Key exists but no encrypted file — treat as first run with key already stored (e.g. after setup_create_key).
        // Create empty DB in temp, init schema, encrypt and write, then open.
        let conn = Connection::open(&path_tmp).map_err(|e| InitDbError::Other(e.to_string()))?;
        init_schema(&conn).map_err(|e| InitDbError::Other(e.to_string()))?;
        init_settings(&conn, &app_data).map_err(|e| InitDbError::Other(e.to_string()))?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").ok();
        let plaintext = std::fs::read(&path_tmp).map_err(|e| InitDbError::Other(e.to_string()))?;
        let ciphertext = encrypt_file(&key, &plaintext).map_err(|e| InitDbError::Other(e))?;
        std::fs::write(&path_encrypted, &ciphertext).map_err(|e| InitDbError::Other(e.to_string()))?;
        return Ok((conn, Some((path_tmp, path_encrypted))));
    }

    // No key.
    if path_plain.exists() {
        return Err(InitDbError::NeedSetup(SetupReason::MigratePlain));
    }
    if path_encrypted.exists() {
        return Err(InitDbError::Other("Encrypted DB exists but no key in keychain".to_string()));
    }
    Err(InitDbError::NeedSetup(SetupReason::FirstRun))
}

/// Flush current DB to encrypted file (e.g. on exit). Caller must hold paths from EncryptedPathsState.
pub fn flush_encrypted_db(conn: &Connection, temp_path: &Path, encrypted_path: &Path) -> Result<(), String> {
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").map_err(|e| e.to_string())?;
    let key = get_db_key()?
        .ok_or_else(|| "No key in keychain".to_string())?;
    let plaintext = std::fs::read(temp_path).map_err(|e| e.to_string())?;
    let ciphertext = encrypt_file(&key, &plaintext)?;
    std::fs::write(encrypted_path, &ciphertext).map_err(|e| e.to_string())?;
    Ok(())
}

/// F1.3: First-run — create key (device or from passphrase), empty DB, encrypt, store key.
pub fn setup_create_key(app: &AppHandle, passphrase: Option<String>) -> Result<(), String> {
    let app_data = app_data_dir(app).map_err(|e| e.to_string())?;
    let path_encrypted = app_data.join(VAULT_DB_ENCRYPTED);
    let path_tmp = app_data.join(VAULT_DB_TMP);

    let key = if let Some(p) = passphrase {
        if p.is_empty() {
            return Err("Passphrase boş olamaz".to_string());
        }
        derive_key(&p)?
    } else {
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);
        key.to_vec()
    };

    set_db_key(&key)?;
    let conn = Connection::open(&path_tmp).map_err(|e| e.to_string())?;
    init_schema(&conn).map_err(|e| e.to_string())?;
    init_settings(&conn, &app_data).map_err(|e| e.to_string())?;
    conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);").ok();
    let plaintext = std::fs::read(&path_tmp).map_err(|e| e.to_string())?;
    let ciphertext = encrypt_file(&key, &plaintext)?;
    std::fs::write(&path_encrypted, &ciphertext).map_err(|e| e.to_string())?;
    Ok(())
}

/// Migrate plain vault.db to encrypted: read plain, encrypt, write vault.db.encrypted, store key, backup plain.
pub fn migrate_plain_to_encrypted(app: &AppHandle, passphrase: Option<String>) -> Result<(), String> {
    let app_data = app_data_dir(app).map_err(|e| e.to_string())?;
    let path_plain = app_data.join(VAULT_DB);
    let path_encrypted = app_data.join(VAULT_DB_ENCRYPTED);
    if !path_plain.exists() {
        return Err("Plain vault.db bulunamadı".to_string());
    }

    let key = if let Some(p) = passphrase {
        if p.is_empty() {
            return Err("Passphrase boş olamaz".to_string());
        }
        derive_key(&p)?
    } else {
        let mut key = [0u8; 32];
        OsRng.fill_bytes(&mut key);
        key.to_vec()
    };

    set_db_key(&key)?;
    let plaintext = std::fs::read(&path_plain).map_err(|e| e.to_string())?;
    let ciphertext = encrypt_file(&key, &plaintext)?;
    std::fs::write(&path_encrypted, &ciphertext).map_err(|e| e.to_string())?;
    let backup = app_data.join("vault.db.plain.backup");
    std::fs::rename(&path_plain, &backup).map_err(|e| e.to_string())?;
    Ok(())
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
    let alter_columns = [
        "ALTER TABLE contacts ADD COLUMN twitter_url TEXT",
        "ALTER TABLE contacts ADD COLUMN email_secondary TEXT",
        "ALTER TABLE contacts ADD COLUMN phone_secondary TEXT",
        "ALTER TABLE contacts ADD COLUMN company_id TEXT",
    ];
    for sql in alter_columns {
        if conn.execute(sql, []).is_err() {}
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
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM custom_fields", [], |r| r.get(0))
        .unwrap_or(0);
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
