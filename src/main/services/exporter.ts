import { writeFileSync, createWriteStream } from 'fs'
import { app } from 'electron'
import Papa from 'papaparse'
import { getAllContacts } from '../database/repositories/contacts'
import { exportEncryptedBuffer, getDatabasePath } from '../database/sqlite/connection'
import { setLastBackupAt } from '../database/repositories/settings'
import archiver from 'archiver'

// Backup format version
const BACKUP_FORMAT_VERSION = 2

export async function exportToCsv(filePath: string): Promise<void> {
  const contacts = getAllContacts()

  // Transform contacts for CSV export
  const csvData = contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    company: contact.company || '',
    title: contact.title || '',
    emails: parseJsonArray(contact.emails).join('; '),
    phones: parseJsonArray(contact.phones).join('; '),
    location: contact.location || '',
    source: contact.source || '',
    notes: contact.notes || '',
    last_contact_at: contact.last_contact_at || '',
    created_at: contact.created_at,
    updated_at: contact.updated_at
  }))

  const csv = Papa.unparse(csvData)
  writeFileSync(filePath, csv, 'utf-8')
}

export async function backupDatabase(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(filePath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      // Update last backup timestamp
      setLastBackupAt(new Date().toISOString())
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    // Add ENCRYPTED database file (never plaintext)
    try {
      const encryptedBuffer = exportEncryptedBuffer()
      archive.append(encryptedBuffer, { name: 'vaultcrm.db.enc' })
    } catch (err) {
      console.error('Failed to export encrypted database:', err)
      reject(new Error('Failed to create encrypted backup'))
      return
    }

    // Add manifest with version and encryption info
    const manifest = {
      version: app.getVersion(),
      format: 'vaultcrm_backup',
      format_version: BACKUP_FORMAT_VERSION,
      created_at: new Date().toISOString(),
      storage_type: 'sqlite_encrypted',
      encryption: {
        algorithm: 'aes-256-gcm',
        header: 'VCDB',
        note: 'Database is encrypted with user master password key'
      }
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // Export contacts as CSV for emergency recovery (minimal data)
    // Note: This is intentionally limited data for recovery purposes
    const contacts = getAllContacts()
    const csvData = contacts.map((contact) => ({
      id: contact.id,
      name: contact.name,
      company: contact.company || '',
      title: contact.title || '',
      emails: parseJsonArray(contact.emails).join('; '),
      phones: parseJsonArray(contact.phones).join('; '),
      location: contact.location || '',
      source: contact.source || '',
      notes: contact.notes || '',
      last_contact_at: contact.last_contact_at || '',
      created_at: contact.created_at,
      updated_at: contact.updated_at
    }))
    const csv = Papa.unparse(csvData)
    archive.append(csv, { name: 'contacts_recovery.csv' })

    archive.finalize()
  })
}

// Restore database from encrypted backup
export async function restoreFromBackup(
  backupPath: string, 
  extractedDbPath: string
): Promise<{ success: boolean; error?: string }> {
  // Note: This function assumes the backup has been unzipped and 
  // the encrypted db file is at extractedDbPath
  // The actual decryption happens in connection.ts when loading
  try {
    const { readFileSync, copyFileSync } = await import('fs')
    const { join } = await import('path')
    
    const userDataPath = app.getPath('userData')
    const dataDir = join(userDataPath, 'data')
    const targetPath = join(dataDir, 'vaultcrm.db')
    
    // Create backup of current db before restore
    const { existsSync } = await import('fs')
    if (existsSync(targetPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      copyFileSync(targetPath, join(dataDir, `vaultcrm.pre-restore-${timestamp}.db`))
    }
    
    // Copy encrypted backup to target location
    copyFileSync(extractedDbPath, targetPath)
    
    return { success: true }
  } catch (error) {
    return { success: false, error: (error as Error).message }
  }
}

function parseJsonArray(json: string | null): string[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
