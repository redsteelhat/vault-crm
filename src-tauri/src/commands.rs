// Tauri commands: contacts, notes, reminders, import (CSV), notifications.
// All data stays local; no cloud calls.

use chrono::Utc;
use rusqlite::{params, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::State;
use uuid::Uuid;

use crate::db::DbState;

// ---- Company (A1.5 şirket kartı) ----

#[derive(Debug, Serialize, Deserialize)]
pub struct Company {
    pub id: String,
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCompanyInput {
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub notes: Option<String>,
}

fn row_to_company(row: &Row) -> rusqlite::Result<Company> {
    Ok(Company {
        id: row.get(0)?,
        name: row.get(1)?,
        domain: row.get(2)?,
        industry: row.get(3)?,
        notes: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

// ---- Contact (A1 kişi kartı) ----

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Contact {
    pub id: String,
    pub first_name: String,
    pub last_name: String,
    pub title: Option<String>,
    pub company: Option<String>,
    pub company_id: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub email_secondary: Option<String>,
    pub phone: Option<String>,
    pub phone_secondary: Option<String>,
    pub linkedin_url: Option<String>,
    pub twitter_url: Option<String>,
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
    pub company_id: Option<String>,
    pub city: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub email_secondary: Option<String>,
    pub phone: Option<String>,
    pub phone_secondary: Option<String>,
    pub linkedin_url: Option<String>,
    pub twitter_url: Option<String>,
    pub website: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DedupCandidate {
    pub a: Contact,
    pub b: Contact,
    pub reasons: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct MergeContactInput {
    pub primary_id: String,
    pub secondary_id: String,
    pub merged: CreateContactInput,
    pub custom_values: Option<Vec<CustomValueInput>>,
}

fn row_to_contact(row: &Row) -> rusqlite::Result<Contact> {
    Ok(Contact {
        id: row.get(0)?,
        first_name: row.get(1)?,
        last_name: row.get(2)?,
        title: row.get(3)?,
        company: row.get(4)?,
        company_id: row.get(5)?,
        city: row.get(6)?,
        country: row.get(7)?,
        email: row.get(8)?,
        email_secondary: row.get(9)?,
        phone: row.get(10)?,
        phone_secondary: row.get(11)?,
        linkedin_url: row.get(12)?,
        twitter_url: row.get(13)?,
        website: row.get(14)?,
        notes: row.get(15)?,
        last_touched_at: row.get(16)?,
        next_touch_at: row.get(17)?,
        created_at: row.get(18)?,
        updated_at: row.get(19)?,
    })
}

fn is_valid_email(v: &Option<String>) -> bool {
    let Some(v) = v else { return true; };
    let v = v.trim();
    if v.is_empty() {
        return true;
    }
    let parts: Vec<&str> = v.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    parts[1].contains('.')
}

fn is_valid_phone(v: &Option<String>) -> bool {
    let Some(v) = v else { return true; };
    let v = v.trim();
    if v.is_empty() {
        return true;
    }
    if !v.chars().all(|c| c.is_ascii_digit() || "+()- .".contains(c)) {
        return false;
    }
    let digits = v.chars().filter(|c| c.is_ascii_digit()).count();
    digits >= 6
}

fn resolve_company_name(
    conn: &rusqlite::Connection,
    company_id: &Option<String>,
    company: &mut Option<String>,
) {
    if let Some(c) = company.as_ref() {
        if !c.trim().is_empty() {
            return;
        }
    }
    let Some(id) = company_id else { return; };
    if let Ok(Some(name)) = conn
        .query_row("SELECT name FROM companies WHERE id = ?1", params![id], |r| r.get::<_, String>(0))
        .optional()
    {
        *company = Some(name);
    }
}

fn normalize_domain(domain: &Option<String>) -> Option<String> {
    let Some(domain) = domain else { return None; };
    let mut d = domain.trim();
    if d.is_empty() {
        return None;
    }
    if let Some(rest) = d.strip_prefix("https://") {
        d = rest;
    } else if let Some(rest) = d.strip_prefix("http://") {
        d = rest;
    }
    let d = d.split('/').next().unwrap_or("").trim();
    if d.is_empty() {
        None
    } else {
        Some(d.to_string())
    }
}

fn normalize_email(value: &Option<String>) -> Option<String> {
    let Some(v) = value else { return None; };
    let v = v.trim().to_lowercase();
    if v.is_empty() {
        None
    } else {
        Some(v)
    }
}

fn normalize_phone(value: &Option<String>) -> Option<String> {
    let Some(v) = value else { return None; };
    let digits: String = v.chars().filter(|c| c.is_ascii_digit()).collect();
    if digits.len() < 6 {
        None
    } else {
        Some(digits)
    }
}

fn normalize_name(first: &str, last: &str) -> String {
    let mut s = String::with_capacity(first.len() + last.len() + 1);
    s.push_str(first);
    s.push(' ');
    s.push_str(last);
    s.chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace())
        .collect::<String>()
        .to_lowercase()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

fn levenshtein(a: &str, b: &str) -> usize {
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    if a_bytes.is_empty() {
        return b_bytes.len();
    }
    if b_bytes.is_empty() {
        return a_bytes.len();
    }
    let mut prev: Vec<usize> = (0..=b_bytes.len()).collect();
    let mut curr = vec![0usize; b_bytes.len() + 1];
    for (i, &ac) in a_bytes.iter().enumerate() {
        curr[0] = i + 1;
        for (j, &bc) in b_bytes.iter().enumerate() {
            let cost = if ac == bc { 0 } else { 1 };
            curr[j + 1] = std::cmp::min(
                std::cmp::min(prev[j + 1] + 1, curr[j] + 1),
                prev[j] + cost,
            );
        }
        prev.clone_from_slice(&curr);
    }
    prev[b_bytes.len()]
}

fn name_similarity(a_first: &str, a_last: &str, b_first: &str, b_last: &str) -> f32 {
    let a = normalize_name(a_first, a_last);
    let b = normalize_name(b_first, b_last);
    if a.is_empty() || b.is_empty() {
        return 0.0;
    }
    let dist = levenshtein(&a, &b) as f32;
    let max_len = a.len().max(b.len()) as f32;
    if max_len == 0.0 {
        0.0
    } else {
        1.0 - (dist / max_len)
    }
}

fn value_contains_option(value: &Option<String>, target: &str) -> bool {
    let Some(value) = value else { return false; };
    let v = value.trim();
    if v.is_empty() {
        return false;
    }
    if let Ok(arr) = serde_json::from_str::<Vec<String>>(v) {
        return arr.iter().any(|s| s == target);
    }
    v.split(',').map(|s| s.trim()).any(|s| s == target)
}

#[tauri::command]
pub fn contact_list(db: State<DbState>) -> Result<Vec<Contact>, String> {
    let mut conn_guard = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn_guard.as_mut().ok_or("DB not initialized")?;
    let sql = "SELECT c.id, c.first_name, c.last_name, c.title,
        COALESCE(co.name, c.company), c.company_id, c.city, c.country,
        c.email, c.email_secondary, c.phone, c.phone_secondary,
        c.linkedin_url, c.twitter_url, c.website, c.notes,
        c.last_touched_at, c.next_touch_at, c.created_at, c.updated_at
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
        ORDER BY c.updated_at DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_contact)
        .map_err(|e| e.to_string())?;
    let list: Vec<Contact> = rows.filter_map(|r| r.ok()).collect();
    Ok(list)
}

#[tauri::command]
pub fn contact_get(db: State<DbState>, id: String) -> Result<Option<Contact>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let sql = "SELECT c.id, c.first_name, c.last_name, c.title,
        COALESCE(co.name, c.company), c.company_id, c.city, c.country,
        c.email, c.email_secondary, c.phone, c.phone_secondary,
        c.linkedin_url, c.twitter_url, c.website, c.notes,
        c.last_touched_at, c.next_touch_at, c.created_at, c.updated_at
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.id = ?1";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let contact = row_to_contact(&row).map_err(|e| e.to_string())?;
        return Ok(Some(contact));
    }
    Ok(None)
}

#[tauri::command]
pub fn contact_create(db: State<DbState>, input: CreateContactInput) -> Result<Contact, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    if !is_valid_email(&input.email) || !is_valid_email(&input.email_secondary) {
        return Err("Geçersiz email formatı".to_string());
    }
    if !is_valid_phone(&input.phone) || !is_valid_phone(&input.phone_secondary) {
        return Err("Geçersiz telefon formatı".to_string());
    }
    let mut company = input.company.clone();
    let company_id = input.company_id.clone();
    {
        let conn_guard = db.0.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("DB not initialized")?;
        resolve_company_name(conn, &company_id, &mut company);
        conn.execute(
            "INSERT INTO contacts (id, first_name, last_name, title, company, company_id, city, country, email, email_secondary, phone, phone_secondary, linkedin_url, twitter_url, website, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                id,
                input.first_name,
                input.last_name,
                input.title,
                company,
                company_id,
                input.city,
                input.country,
                input.email,
                input.email_secondary,
                input.phone,
                input.phone_secondary,
                input.linkedin_url,
                input.twitter_url,
                input.website,
                input.notes,
                now,
                now,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
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
    if !is_valid_email(&input.email) || !is_valid_email(&input.email_secondary) {
        return Err("Geçersiz email formatı".to_string());
    }
    if !is_valid_phone(&input.phone) || !is_valid_phone(&input.phone_secondary) {
        return Err("Geçersiz telefon formatı".to_string());
    }
    let mut company = input.company.clone();
    let company_id = input.company_id.clone();
    {
        let conn_guard = db.0.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("DB not initialized")?;
        resolve_company_name(conn, &company_id, &mut company);
        conn.execute(
            "UPDATE contacts SET first_name=?1, last_name=?2, title=?3, company=?4, company_id=?5, city=?6, country=?7, email=?8, email_secondary=?9, phone=?10, phone_secondary=?11, linkedin_url=?12, twitter_url=?13, website=?14, notes=?15, updated_at=?16 WHERE id=?17",
            params![
                input.first_name,
                input.last_name,
                input.title,
                company,
                company_id,
                input.city,
                input.country,
                input.email,
                input.email_secondary,
                input.phone,
                input.phone_secondary,
                input.linkedin_url,
                input.twitter_url,
                input.website,
                input.notes,
                now,
                id,
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    contact_get(db, id)?.ok_or_else(|| "Contact not found".to_string())
}

#[tauri::command]
pub fn contact_delete(db: State<DbState>, id: String) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    conn.execute("DELETE FROM contacts WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn company_list(db: State<DbState>) -> Result<Vec<Company>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare("SELECT id, name, domain, industry, notes, created_at, updated_at FROM companies ORDER BY name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_company)
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn company_get(db: State<DbState>, id: String) -> Result<Option<Company>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare("SELECT id, name, domain, industry, notes, created_at, updated_at FROM companies WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(params![id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let company = row_to_company(&row).map_err(|e| e.to_string())?;
        return Ok(Some(company));
    }
    Ok(None)
}

#[tauri::command]
pub fn company_create(db: State<DbState>, input: CreateCompanyInput) -> Result<Company, String> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let domain = normalize_domain(&input.domain);
    {
        let conn_guard = db.0.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("DB not initialized")?;
        conn.execute(
            "INSERT INTO companies (id, name, domain, industry, notes, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![id, input.name, domain, input.industry, input.notes, now, now],
        )
        .map_err(|e| e.to_string())?;
    }
    company_get(db, id)?.ok_or_else(|| "Company not found after insert".to_string())
}

#[derive(Debug, Deserialize)]
pub struct UpdateCompanyInput {
    pub name: String,
    pub domain: Option<String>,
    pub industry: Option<String>,
    pub notes: Option<String>,
}

#[tauri::command]
pub fn company_update(
    db: State<DbState>,
    id: String,
    input: UpdateCompanyInput,
) -> Result<Company, String> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let domain = normalize_domain(&input.domain);
    {
        let conn_guard = db.0.lock().map_err(|e| e.to_string())?;
        let conn = conn_guard.as_ref().ok_or("DB not initialized")?;
        conn.execute(
            "UPDATE companies SET name=?1, domain=?2, industry=?3, notes=?4, updated_at=?5 WHERE id=?6",
            params![input.name, domain, input.industry, input.notes, now, id],
        )
        .map_err(|e| e.to_string())?;
    }
    company_get(db, id)?.ok_or_else(|| "Company not found".to_string())
}

#[tauri::command]
pub fn contact_list_by_company(db: State<DbState>, company_id: String) -> Result<Vec<Contact>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let sql = "SELECT c.id, c.first_name, c.last_name, c.title,
        COALESCE(co.name, c.company), c.company_id, c.city, c.country,
        c.email, c.email_secondary, c.phone, c.phone_secondary,
        c.linkedin_url, c.twitter_url, c.website, c.notes,
        c.last_touched_at, c.next_touch_at, c.created_at, c.updated_at
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
        WHERE c.company_id = ?1 ORDER BY c.updated_at DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![company_id], row_to_contact)
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

// ---- Custom fields (A3) ----

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomField {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub options: Option<String>,
    pub sort_order: i64,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CustomValue {
    pub field_id: String,
    pub field_name: String,
    pub kind: String,
    pub options: Option<String>,
    pub value: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateCustomFieldInput {
    pub name: String,
    pub kind: String,
    pub options: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CustomValueInput {
    pub field_id: String,
    pub value: Option<String>,
}

#[tauri::command]
pub fn custom_field_list(db: State<DbState>) -> Result<Vec<CustomField>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let mut stmt = conn
        .prepare("SELECT id, name, kind, options, sort_order, created_at FROM custom_fields ORDER BY sort_order, name")
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(CustomField {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                options: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn custom_field_create(db: State<DbState>, input: CreateCustomFieldInput) -> Result<CustomField, String> {
    let id = format!("cf_{}", Uuid::new_v4().to_string().replace('-', "").chars().take(12).collect::<String>());
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let kind = if input.kind.is_empty() { "text" } else { input.kind.as_str() };
    conn.execute(
        "INSERT INTO custom_fields (id, name, kind, options, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, 999, ?5)",
        params![id, input.name, kind, input.options, now],
    )
    .map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, kind, options, sort_order, created_at FROM custom_fields WHERE id = ?1")
        .map_err(|e| e.to_string())?;
    let row = stmt
        .query_row(params![id], |row| {
            Ok(CustomField {
                id: row.get(0)?,
                name: row.get(1)?,
                kind: row.get(2)?,
                options: row.get(3)?,
                sort_order: row.get(4)?,
                created_at: row.get(5)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(row)
}

#[tauri::command]
pub fn contact_custom_values_get(db: State<DbState>, contact_id: String) -> Result<Vec<CustomValue>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let sql = "SELECT f.id, f.name, f.kind, f.options, v.value
        FROM custom_fields f
        LEFT JOIN contact_custom_values v ON v.field_id = f.id AND v.contact_id = ?1
        ORDER BY f.sort_order, f.name";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![contact_id], |row| {
            Ok(CustomValue {
                field_id: row.get(0)?,
                field_name: row.get(1)?,
                kind: row.get(2)?,
                options: row.get(3)?,
                value: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub fn contact_custom_values_set(
    db: State<DbState>,
    contact_id: String,
    values: Vec<CustomValueInput>,
) -> Result<(), String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    for v in values {
        conn.execute(
            "INSERT INTO contact_custom_values (contact_id, field_id, value) VALUES (?1, ?2, ?3)
             ON CONFLICT(contact_id, field_id) DO UPDATE SET value = excluded.value",
            params![contact_id, v.field_id, v.value],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn contact_ids_by_custom_value(
    db: State<DbState>,
    field_id: String,
    value: String,
) -> Result<Vec<String>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let kind: Option<String> = conn
        .query_row(
            "SELECT kind FROM custom_fields WHERE id = ?1",
            params![field_id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if kind.as_deref() == Some("multi_select") {
        let mut stmt = conn
            .prepare("SELECT contact_id, value FROM contact_custom_values WHERE field_id = ?1")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![field_id], |row| {
                Ok((row.get::<_, String>(0)?, row.get::<_, Option<String>>(1)?))
            })
            .map_err(|e| e.to_string())?;
        let mut ids = Vec::new();
        for row in rows {
            if let Ok((contact_id, v)) = row {
                if value_contains_option(&v, &value) {
                    ids.push(contact_id);
                }
            }
        }
        Ok(ids)
    } else {
        let mut stmt = conn
            .prepare("SELECT contact_id FROM contact_custom_values WHERE field_id = ?1 AND value = ?2")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![field_id, value], |row| row.get::<_, String>(0))
            .map_err(|e| e.to_string())?;
        Ok(rows.filter_map(|r| r.ok()).collect())
    }
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

#[tauri::command]
pub fn dedup_candidates(db: State<DbState>) -> Result<Vec<DedupCandidate>, String> {
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let sql = "SELECT c.id, c.first_name, c.last_name, c.title,
        COALESCE(co.name, c.company), c.company_id, c.city, c.country,
        c.email, c.email_secondary, c.phone, c.phone_secondary,
        c.linkedin_url, c.twitter_url, c.website, c.notes,
        c.last_touched_at, c.next_touch_at, c.created_at, c.updated_at
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id
        ORDER BY c.updated_at DESC";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], row_to_contact)
        .map_err(|e| e.to_string())?;
    let contacts: Vec<Contact> = rows.filter_map(|r| r.ok()).collect();

    let mut by_id: HashMap<String, Contact> = HashMap::new();
    for c in contacts.iter() {
        by_id.insert(c.id.clone(), c.clone());
    }

    #[derive(Default)]
    struct ReasonFlags {
        email: bool,
        phone: bool,
        name: bool,
    }

    let mut pair_reasons: HashMap<(String, String), ReasonFlags> = HashMap::new();

    let mut email_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut phone_map: HashMap<String, Vec<String>> = HashMap::new();

    for c in contacts.iter() {
        if let Some(e) = normalize_email(&c.email) {
            email_map.entry(e).or_default().push(c.id.clone());
        }
        if let Some(e) = normalize_email(&c.email_secondary) {
            email_map.entry(e).or_default().push(c.id.clone());
        }
        if let Some(p) = normalize_phone(&c.phone) {
            phone_map.entry(p).or_default().push(c.id.clone());
        }
        if let Some(p) = normalize_phone(&c.phone_secondary) {
            phone_map.entry(p).or_default().push(c.id.clone());
        }
    }

    let mut add_reason = |a: &str, b: &str, kind: &str| {
        if a == b {
            return;
        }
        let (x, y) = if a < b { (a.to_string(), b.to_string()) } else { (b.to_string(), a.to_string()) };
        let entry = pair_reasons.entry((x, y)).or_default();
        match kind {
            "email" => entry.email = true,
            "phone" => entry.phone = true,
            "name" => entry.name = true,
            _ => {}
        }
    };

    for ids in email_map.values() {
        if ids.len() < 2 {
            continue;
        }
        for i in 0..ids.len() {
            for j in (i + 1)..ids.len() {
                add_reason(&ids[i], &ids[j], "email");
            }
        }
    }

    for ids in phone_map.values() {
        if ids.len() < 2 {
            continue;
        }
        for i in 0..ids.len() {
            for j in (i + 1)..ids.len() {
                add_reason(&ids[i], &ids[j], "phone");
            }
        }
    }

    let name_threshold = 0.85;
    for i in 0..contacts.len() {
        for j in (i + 1)..contacts.len() {
            let a = &contacts[i];
            let b = &contacts[j];
            let sim = name_similarity(&a.first_name, &a.last_name, &b.first_name, &b.last_name);
            if sim >= name_threshold {
                add_reason(&a.id, &b.id, "name");
            }
        }
    }

    let mut candidates = Vec::new();
    for ((a_id, b_id), flags) in pair_reasons {
        if let (Some(a), Some(b)) = (by_id.get(&a_id), by_id.get(&b_id)) {
            let mut reasons = Vec::new();
            if flags.email {
                reasons.push("email".to_string());
            }
            if flags.phone {
                reasons.push("phone".to_string());
            }
            if flags.name {
                reasons.push("name".to_string());
            }
            if !reasons.is_empty() {
                candidates.push(DedupCandidate {
                    a: a.clone(),
                    b: b.clone(),
                    reasons,
                });
            }
        }
    }

    Ok(candidates)
}

#[tauri::command]
pub fn contact_merge(db: State<DbState>, input: MergeContactInput) -> Result<Contact, String> {
    let now = Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    if !is_valid_email(&input.merged.email) || !is_valid_email(&input.merged.email_secondary) {
        return Err("Geçersiz email formatı".to_string());
    }
    if !is_valid_phone(&input.merged.phone) || !is_valid_phone(&input.merged.phone_secondary) {
        return Err("Geçersiz telefon formatı".to_string());
    }
    let conn = db.0.lock().map_err(|e| e.to_string())?;
    let conn = conn.as_ref().ok_or("DB not initialized")?;
    let sql = "SELECT c.id, c.first_name, c.last_name, c.title,
        COALESCE(co.name, c.company), c.company_id, c.city, c.country,
        c.email, c.email_secondary, c.phone, c.phone_secondary,
        c.linkedin_url, c.twitter_url, c.website, c.notes,
        c.last_touched_at, c.next_touch_at, c.created_at, c.updated_at
        FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.id = ?1";
    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let primary = stmt
        .query_row(params![input.primary_id.clone()], row_to_contact)
        .map_err(|e| e.to_string())?;
    let secondary = stmt
        .query_row(params![input.secondary_id.clone()], row_to_contact)
        .map_err(|e| e.to_string())?;
    drop(stmt);

    let last_touched_at = match (primary.last_touched_at.clone(), secondary.last_touched_at.clone()) {
        (Some(a), Some(b)) => Some(if a >= b { a } else { b }),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        _ => None,
    };
    let next_touch_at = match (primary.next_touch_at.clone(), secondary.next_touch_at.clone()) {
        (Some(a), Some(b)) => Some(if a <= b { a } else { b }),
        (Some(a), None) => Some(a),
        (None, Some(b)) => Some(b),
        _ => None,
    };

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    tx.execute(
        "UPDATE contacts SET first_name=?1, last_name=?2, title=?3, company=?4, company_id=?5, city=?6, country=?7, email=?8, email_secondary=?9, phone=?10, phone_secondary=?11, linkedin_url=?12, twitter_url=?13, website=?14, notes=?15, last_touched_at=?16, next_touch_at=?17, updated_at=?18 WHERE id=?19",
        params![
            input.merged.first_name,
            input.merged.last_name,
            input.merged.title,
            input.merged.company,
            input.merged.company_id,
            input.merged.city,
            input.merged.country,
            input.merged.email,
            input.merged.email_secondary,
            input.merged.phone,
            input.merged.phone_secondary,
            input.merged.linkedin_url,
            input.merged.twitter_url,
            input.merged.website,
            input.merged.notes,
            last_touched_at,
            next_touch_at,
            now,
            &input.primary_id,
        ],
    )
    .map_err(|e| e.to_string())?;

    // Merge tags
    tx.execute(
        "INSERT OR IGNORE INTO contact_tags (contact_id, tag_id)
         SELECT ?1, tag_id FROM contact_tags WHERE contact_id = ?2",
        params![&input.primary_id, &input.secondary_id],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "DELETE FROM contact_tags WHERE contact_id = ?1",
        params![&input.secondary_id],
    )
    .map_err(|e| e.to_string())?;

    // Merge custom values: replace primary with provided values if present
    if let Some(values) = input.custom_values {
        tx.execute(
            "DELETE FROM contact_custom_values WHERE contact_id = ?1",
            params![&input.primary_id],
        )
        .map_err(|e| e.to_string())?;
        for v in values {
            tx.execute(
                "INSERT INTO contact_custom_values (contact_id, field_id, value) VALUES (?1, ?2, ?3)",
                params![&input.primary_id, v.field_id, v.value],
            )
            .map_err(|e| e.to_string())?;
        }
    } else {
        tx.execute(
            "INSERT OR IGNORE INTO contact_custom_values (contact_id, field_id, value)
             SELECT ?1, field_id, value FROM contact_custom_values WHERE contact_id = ?2",
            params![&input.primary_id, &input.secondary_id],
        )
        .map_err(|e| e.to_string())?;
    }
    tx.execute(
        "DELETE FROM contact_custom_values WHERE contact_id = ?1",
        params![&input.secondary_id],
    )
    .map_err(|e| e.to_string())?;

    // Move related rows
    tx.execute(
        "UPDATE notes SET contact_id = ?1 WHERE contact_id = ?2",
        params![&input.primary_id, &input.secondary_id],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE reminders SET contact_id = ?1 WHERE contact_id = ?2",
        params![&input.primary_id, &input.secondary_id],
    )
    .map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE interactions SET contact_id = ?1 WHERE contact_id = ?2",
        params![&input.primary_id, &input.secondary_id],
    )
    .map_err(|e| e.to_string())?;

    tx.execute(
        "DELETE FROM contacts WHERE id = ?1",
        params![&input.secondary_id],
    )
    .map_err(|e| e.to_string())?;

    tx.commit().map_err(|e| e.to_string())?;

    contact_get(db, input.primary_id.clone())?
        .ok_or_else(|| "Contact not found after merge".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    #[test]
    fn validates_email_format() {
        assert!(is_valid_email(&None));
        assert!(is_valid_email(&Some("".to_string())));
        assert!(is_valid_email(&Some("test@example.com".to_string())));
        assert!(!is_valid_email(&Some("bad-email".to_string())));
        assert!(!is_valid_email(&Some("no-at.example.com".to_string())));
        assert!(!is_valid_email(&Some("a@b".to_string())));
    }

    #[test]
    fn validates_phone_format() {
        assert!(is_valid_phone(&None));
        assert!(is_valid_phone(&Some("".to_string())));
        assert!(is_valid_phone(&Some("+90 532 123 45 67".to_string())));
        assert!(is_valid_phone(&Some("(212) 555-1212".to_string())));
        assert!(!is_valid_phone(&Some("abc".to_string())));
        assert!(!is_valid_phone(&Some("12".to_string())));
    }

    #[test]
    fn resolves_company_name_from_id() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        conn.execute(
            "CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
            [],
        )
        .expect("create companies table");
        conn.execute(
            "INSERT INTO companies (id, name) VALUES (?1, ?2)",
            params!["c1", "Acme"],
        )
        .expect("insert company");

        let mut company = None;
        let company_id = Some("c1".to_string());
        resolve_company_name(&conn, &company_id, &mut company);
        assert_eq!(company, Some("Acme".to_string()));
    }

    #[test]
    fn does_not_override_existing_company_name() {
        let conn = Connection::open_in_memory().expect("open in-memory db");
        conn.execute(
            "CREATE TABLE companies (id TEXT PRIMARY KEY, name TEXT NOT NULL)",
            [],
        )
        .expect("create companies table");
        conn.execute(
            "INSERT INTO companies (id, name) VALUES (?1, ?2)",
            params!["c1", "Acme"],
        )
        .expect("insert company");

        let mut company = Some("Manual Co".to_string());
        let company_id = Some("c1".to_string());
        resolve_company_name(&conn, &company_id, &mut company);
        assert_eq!(company, Some("Manual Co".to_string()));
    }

    #[test]
    fn normalizes_domain_values() {
        assert_eq!(normalize_domain(&None), None);
        assert_eq!(normalize_domain(&Some("".to_string())), None);
        assert_eq!(
            normalize_domain(&Some(" https://example.com/path ".to_string())),
            Some("example.com".to_string())
        );
        assert_eq!(
            normalize_domain(&Some("http://example.com".to_string())),
            Some("example.com".to_string())
        );
        assert_eq!(
            normalize_domain(&Some("example.com".to_string())),
            Some("example.com".to_string())
        );
    }
}
