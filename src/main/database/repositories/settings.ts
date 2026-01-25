import { query, queryOne, run } from '../sqlite/connection'
import type { Settings } from '../types'

export function getSetting(key: string): string | null {
  const result = queryOne<Settings>('SELECT * FROM settings WHERE key = ?', [key])
  return result?.value || null
}

export function setSetting(key: string, value: string): void {
  run(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `, [key, value])
}

export function getAllSettings(): Settings[] {
  return query<Settings>('SELECT * FROM settings ORDER BY key ASC')
}

export function deleteSetting(key: string): void {
  run('DELETE FROM settings WHERE key = ?', [key])
}

// Get multiple settings at once
export function getSettings(keys: string[]): Record<string, string | null> {
  const placeholders = keys.map(() => '?').join(', ')
  const results = query<Settings>(`
    SELECT * FROM settings WHERE key IN (${placeholders})
  `, keys)
  
  const settings: Record<string, string | null> = {}
  for (const key of keys) {
    settings[key] = results.find(r => r.key === key)?.value || null
  }
  return settings
}

// Set multiple settings at once
export function setSettings(settings: Record<string, string>): void {
  for (const [key, value] of Object.entries(settings)) {
    setSetting(key, value)
  }
}

// App-specific settings helpers
export function getSchemaVersion(): number {
  const version = getSetting('schema_version')
  return version ? parseInt(version, 10) : 1
}

export function getStorageVersion(): string {
  return getSetting('storage_version') || 'v0_json'
}

export function setStorageVersion(version: string): void {
  setSetting('storage_version', version)
}

export function getLastCleanExit(): boolean {
  const value = getSetting('last_clean_exit')
  return value === 'true'
}

export function setLastCleanExit(clean: boolean): void {
  setSetting('last_clean_exit', clean ? 'true' : 'false')
}

export function getLastBackupAt(): string | null {
  return getSetting('last_backup_at')
}

export function setLastBackupAt(date: string): void {
  setSetting('last_backup_at', date)
}
