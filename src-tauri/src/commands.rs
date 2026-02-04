// Tauri commands: contacts, notes, reminders, import (CSV), notifications.
// All data stays local; no cloud calls.

use chrono::Utc;
use rusqlite::params;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::db::DbState;

// ---- Contact ----

#[derive(Debug, Serialize, Deserialize)]
pub struct Contact {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub company: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub notes: Option<String>,
    pub last_touched_at: Option<String>,
    pub next_touch_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateContactInput {
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub company: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn contact_list(db: State<DbState>) -> Result<Vec<Contact>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, first_name, last_name, title, company, city, country, email, phone, linkedin_url, website, notes, last_touched_at, next_touch_at, created_at, updated_at FROM contacts ORDER BY updated_at DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Contact {
                id: row.get(0)?,
                first_name: row.get(1)?,
                last_name: row.get(2)?,
                title: row.get(3)?,
                company: row.get(4)?,
                city: row.get(5)?,
                country: row.get(6)?,
                email: row.get(7)?,
                phone: row.get(8)?,
                linkedin_url: row.get(9)?,
                website: row.get(10)?,
                notes: row.get(11)?,
                last_touched_at: row.get(12)?,
                next_touch_at: row.get(13)?,
                created_at: row.get(14)?,
                updated_at: row.get(15)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let list: Vec<Contact> = rows.filter_map(|r| r.ok()).collect();
    Ok(list)
}

#[tauri::command]
pub fn contact_get(db: State<DbState>, id: String) -> Result<Option<Contact>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare(
            "SELECT id, first_name, last_name, title, company, city, country, email, phone, linkedin_url, website, notes, last_touched_at, next_touch_at, created_at, updated_at FROM contacts WHERE id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        return Ok(Some(Contact {
            id: row.get(0)?,
            first_name: row.get(1)?,
            last_name: row.get(2)?,
            title: row.get(3)?,
            company: row.get(4)?,
            city: row.get(5)?,
            country: row.get(6)?,
            email: row.get(7)?,
            phone: row.get(8)?,
            linkedin_url: row.get(9)?,
            website: row.get(10)?,
            notes: row.get(11)?,
            last_touched_at: row.get(12)?,
            next_touch_at: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        }));
    }
    Ok(None)
}

#[tauri::command]
pub fn contact_create(db: State<DbState>, input: CreateContactInput) -> Result<Contact, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute(
        "INSERT INTO contacts (id, first_name, last_name, title, company, city, country, email, phone, linkedin_url, website, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
        params![
            id,
            input.first_name,
            input.last_name,
            input.title,
            input.company,
            input.city,
            input.country,
            input.email,
            input.phone,
            input.linkedin_url,
            input.website,
            input.notes,
            now,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;
    contact_get(db, id)?
        .ok_or_else(|| "Contact not found after insert".to_string())
}

#[tauri::command]
pub fn contact_update(
    db: State<DbState>,
    id: String,
    input: CreateContactInput,
) -> Result<Contact, String> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute(
        "UPDATE contacts SET first_name=?1, last_name=?2, title=?3, company=?4, city=?5, country=?6, email=?7, phone=?8, linkedin_url=?9, website=?10, notes=?11, updated_at=?12 WHERE id=?13",
        params![
            input.first_name,
            input.last_name,
            input.title,
            input.company,
            input.city,
            input.country,
            input.email,
            input.phone,
            input.linkedin_url,
            input.website,
            input.notes,
            now,
            id,
        ],
    )
    .map_err(|e| e.to_string())?;
    contact_get(db, id)?.ok_or_else(|| "Contact not found".to_string())
}

#[tauri::command]
pub fn contact_delete(db: State<DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute("DELETE FROM contacts WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Notes ----

#[derive(Debug, Serialize, Deserialize)]
pub struct Note {
    pub id: String,
    pub contact_id: String,
    pub kind: String,
    pub title: Option<String>,
    pub body: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateNoteInput {
    pub contact_id: String,
    pub kind: Option<String>,
    pub title: Option<String>,
    pub body: String,
}

#[tauri::command]
pub fn note_list(db: State<DbState>, contact_id: String) -> Result<Vec<Note>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare("SELECT id, contact_id, kind, title, body, created_at, updated_at FROM notes WHERE contact_id = ?1 ORDER BY created_at DESC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![contact_id], |row| {
            Ok(Note {
                id: row.get(0)?,
                contact_id: row.get(1)?,
                kind: row.get(2)?,
                title: row.get(3)?,
                body: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn note_create(db: State<DbState>, input: CreateNoteInput) -> Result<Note, String> {
    let id = Uuid::new_v4().to_string();
    let kind = input.kind.unwrap_or_else(|| "note".to_string());
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute(
        "INSERT INTO notes (id, contact_id, kind, title, body, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, input.contact_id, kind, input.title, input.body, now, now],
    )
    .map_err(|e| e.to_string())?;
    // Update contact last_touched_at
    let _ = conn.execute(
        "UPDATE contacts SET last_touched_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![now, input.contact_id],
    );
    let mut stmt = conn
        .prepare("SELECT id, contact_id, kind, title, body, created_at, updated_at FROM notes WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let row = stmt
        .query_row(params![id], |row| {
            Ok(Note {
                id: row.get(0)?,
                contact_id: row.get(1)?,
                kind: row.get(2)?,
                title: row.get(3)?,
                body: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(row)
}

// ---- Reminders ----

#[derive(Debug, Serialize, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub contact_id: String,
    pub note_id: Option<String>,
    pub title: String,
    pub due_at: String,
    pub snooze_until: Option<String>,
    pub recurring_days: Option<i64>,
    pub completed_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateReminderInput {
    pub contact_id: String,
    pub note_id: Option<String>,
    pub title: String,
    pub due_at: String,
    pub recurring_days: Option<i64>,
}

#[tauri::command]
pub fn reminder_list(db: State<DbState>) -> Result<Vec<Reminder>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare("SELECT id, contact_id, note_id, title, due_at, snooze_until, recurring_days, completed_at, created_at FROM reminders WHERE completed_at IS NULL ORDER BY due_at ASC")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                contact_id: row.get(1)?,
                note_id: row.get(2)?,
                title: row.get(3)?,
                due_at: row.get(4)?,
                snooze_until: row.get(5)?,
                recurring_days: row.get(6)?,
                completed_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn reminder_create(db: State<DbState>, input: CreateReminderInput) -> Result<Reminder, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute(
        "INSERT INTO reminders (id, contact_id, note_id, title, due_at, recurring_days, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            id,
            input.contact_id,
            input.note_id,
            input.title,
            input.due_at,
            input.recurring_days,
            now,
        ],
    )
    .map_err(|e| e.to_string())?;
    // Update contact next_touch_at
    let _ = conn.execute(
        "UPDATE contacts SET next_touch_at = ?1, updated_at = ?1 WHERE id = ?2",
        params![input.due_at, now, input.contact_id],
    );
    let mut stmt = conn
        .prepare("SELECT id, contact_id, note_id, title, due_at, snooze_until, recurring_days, completed_at, created_at FROM reminders WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let row = stmt
        .query_row(params![id], |row| {
            Ok(Reminder {
                id: row.get(0)?,
                contact_id: row.get(1)?,
                note_id: row.get(2)?,
                title: row.get(3)?,
                due_at: row.get(4)?,
                snooze_until: row.get(5)?,
                recurring_days: row.get(6)?,
                completed_at: row.get(7)?,
                created_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub fn reminder_complete(db: State<DbState>, id: String) -> Result<(), String> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute("UPDATE reminders SET completed_at = ?1 WHERE id = ?2", params![now, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn reminder_snooze(db: State<DbState>, id: String, until: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute("UPDATE reminders SET snooze_until = ?1 WHERE id = ?2", params![until, id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ---- Import (CSV) ----
// Frontend sends parsed rows; we create contacts. Dedup/merge can be added later.

#[derive(Debug, Deserialize)]
pub struct ImportRow {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub title: Option<String>,
    pub company: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub website: Option<String>,
}

#[tauri::command]
pub fn import_contacts(db: State<DbState>, rows: Vec<ImportRow>) -> Result<u64, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let mut count = 0u64;
    for row in rows {
        let first = row.first_name.unwrap_or_default();
        let last = row.last_name.unwrap_or_default();
        if first.is_empty() && last.is_empty() {
            continue;
        }
        let id = Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO contacts (id, first_name, last_name, title, company, city, country, email, phone, linkedin_url, website, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            params![
                id,
                first,
                last,
                row.title,
                row.company,
                row.city,
                row.country,
                row.email,
                row.phone,
                row.linkedin_url,
                row.website,
                now,
                now,
            ],
        )
        .map_err(|e| e.to_string())?;
        count += 1;
    }
    Ok(count)
}

// ---- Search (FTS) ----

#[tauri::command]
pub fn search_contacts(db: State<DbState>, q: String) -> Result<Vec<String>, String> {
    if q.trim().is_empty() {
        return Ok(vec![]);
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    // FTS5: content table is 'contacts', so we query contacts_fts and join to get id
    let query = format!("{}*", q.trim().replace(' ', "* "));
    let mut stmt = conn
        .prepare("SELECT rowid FROM contacts_fts WHERE contacts_fts MATCH ?1 LIMIT 50")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![query], |row| row.get::<_, i64>(0))
        .map_err(|e| e.to_string())?;
    let mut ids = Vec::new();
    for row in rows {
        if let Ok(rowid) = row {
            let mut get_id = conn
                .prepare("SELECT id FROM contacts WHERE rowid = ?1")
                .map_err(|e| e.to_string())?;
            if let Ok(Some(id)) = get_id.query_row(params![rowid], |r| r.get::<_, String>(0)).optional() {
                ids.push(id);
            }
        }
    }
    Ok(ids)
}

// Use optional() - need to add that. Actually rusqlite QueryRow has optional(). Let me check - it's query_row().optional() in newer rusqlite. Simpler: just get id from rowid. Actually we have content='contacts' so rowid of contacts_fts matches rowid of contacts. So SELECT id FROM contacts WHERE rowid = ? works. But we're iterating and doing N queries. Better: SELECT c.id FROM contacts c JOIN contacts_fts f ON c.rowid = f.rowid WHERE f.contacts_fts MATCH ?1. Let me fix.
// FTS5 content table: content_rowid is 'rowid', so contacts_fts.rowid = contacts.rowid. So we can do:
// SELECT id FROM contacts WHERE rowid IN (SELECT rowid FROM contacts_fts WHERE contacts_fts MATCH ?1)
// One query.
</think>
FTS sorgusunu düzeltiyorum ve lib.rs'i yazıyorum.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace