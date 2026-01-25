import { writeFileSync, createWriteStream } from 'fs'
import { join } from 'path'
import Papa from 'papaparse'
import { getAllContacts } from '../database/repositories/contacts'
import { exportDatabaseBuffer, getDatabasePath } from '../database/sqlite/connection'
import { setLastBackupAt } from '../database/repositories/settings'
import archiver from 'archiver'

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

    // Add database file
    try {
      const dbBuffer = exportDatabaseBuffer()
      archive.append(dbBuffer, { name: 'vaultcrm.db' })
    } catch {
      // If database export fails, try adding raw file
      const dbPath = getDatabasePath()
      if (dbPath) {
        archive.file(dbPath, { name: 'vaultcrm.db' })
      }
    }

    // Add manifest with version info
    const manifest = {
      version: '1.0.0',
      format: 'vaultcrm_backup_v1',
      created_at: new Date().toISOString(),
      storage_type: 'sqlite_encrypted'
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' })

    // Export contacts as CSV for easy recovery
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
    archive.append(csv, { name: 'contacts_export.csv' })

    archive.finalize()
  })
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
