import { readFileSync } from 'fs'
import Papa from 'papaparse'
import { createContact, checkDuplicateByEmail } from '../database/repositories/contacts'
import type { ImportResult, CsvPreview } from '../database/types'

export function previewCsv(filePath: string): CsvPreview {
  const content = readFileSync(filePath, 'utf-8')
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    preview: 10 // Only preview first 10 rows
  })

  return {
    headers: result.meta.fields || [],
    rows: result.data as Record<string, string>[]
  }
}

export async function importCsv(
  filePath: string,
  mapping: Record<string, string>
): Promise<ImportResult> {
  const content = readFileSync(filePath, 'utf-8')
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true
  })

  const rows = result.data as Record<string, string>[]
  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 for header row and 0-based index

    try {
      // Get mapped values
      const name = mapping.name ? row[mapping.name]?.trim() : null
      const email = mapping.email ? row[mapping.email]?.trim() : null
      const company = mapping.company ? row[mapping.company]?.trim() : null
      const title = mapping.title ? row[mapping.title]?.trim() : null
      const phone = mapping.phone ? row[mapping.phone]?.trim() : null
      const location = mapping.location ? row[mapping.location]?.trim() : null
      const source = mapping.source ? row[mapping.source]?.trim() : null
      const notes = mapping.notes ? row[mapping.notes]?.trim() : null

      // Validate required fields
      if (!name) {
        errors.push(`Row ${rowNum}: Missing required field 'name'`)
        skipped++
        continue
      }

      // Check for duplicates by email
      if (email) {
        const existing = checkDuplicateByEmail(email)
        if (existing) {
          errors.push(`Row ${rowNum}: Duplicate email '${email}' - contact '${existing.name}' already exists`)
          skipped++
          continue
        }
      }

      // Create contact
      createContact({
        name,
        company: company || null,
        title: title || null,
        emails: email ? JSON.stringify([email]) : '[]',
        phones: phone ? JSON.stringify([phone]) : '[]',
        location: location || null,
        source: source || 'CSV Import',
        notes: notes || null,
        last_contact_at: null
      })

      imported++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      errors.push(`Row ${rowNum}: ${message}`)
      skipped++
    }
  }

  return { imported, skipped, errors }
}

// Validate CSV mapping
export function validateMapping(mapping: Record<string, string>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!mapping.name) {
    errors.push('Name field mapping is required')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}
