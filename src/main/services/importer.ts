import { readFileSync } from 'fs'
import Papa from 'papaparse'
import * as contactsRepo from '../database/repositories/contacts'
import type { ImportResult, CsvPreview } from '../database/types'

export function previewCsv(filePath: string): CsvPreview {
  const fileContent = readFileSync(filePath, 'utf-8')

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    preview: 10,
    skipEmptyLines: true
  })

  return {
    headers: result.meta.fields || [],
    rows: result.data
  }
}

export function importCsv(
  filePath: string,
  mapping: Record<string, string>
): ImportResult {
  const fileContent = readFileSync(filePath, 'utf-8')

  const result = Papa.parse<Record<string, string>>(fileContent, {
    header: true,
    skipEmptyLines: true
  })

  const imported: string[] = []
  const skipped: string[] = []
  const errors: string[] = []

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i]
    const rowNum = i + 2

    try {
      const name = mapping.name ? row[mapping.name]?.trim() : ''
      const email = mapping.email ? row[mapping.email]?.trim() : ''
      const company = mapping.company ? row[mapping.company]?.trim() : null
      const title = mapping.title ? row[mapping.title]?.trim() : null
      const phone = mapping.phone ? row[mapping.phone]?.trim() : null
      const location = mapping.location ? row[mapping.location]?.trim() : null
      const source = mapping.source ? row[mapping.source]?.trim() : 'CSV Import'
      const notes = mapping.notes ? row[mapping.notes]?.trim() : null

      if (!name) {
        errors.push(`Row ${rowNum}: Name is required`)
        continue
      }

      if (email) {
        const existing = contactsRepo.checkDuplicateByEmail(email)
        if (existing) {
          skipped.push(`Row ${rowNum}: Duplicate email (${email})`)
          continue
        }
      }

      const emails = email ? JSON.stringify([email]) : '[]'
      const phones = phone ? JSON.stringify([phone]) : '[]'

      contactsRepo.createContact({
        name,
        company,
        title,
        emails,
        phones,
        location,
        source,
        notes,
        last_contact_at: null
      })

      imported.push(name)
    } catch (error) {
      errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return {
    imported: imported.length,
    skipped: skipped.length,
    errors: [...errors, ...skipped]
  }
}
