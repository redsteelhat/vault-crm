import { writeFileSync } from 'fs'
import Papa from 'papaparse'
import * as contactsRepo from '../database/repositories/contacts'
import { getDatabaseBuffer } from '../database/connection'

export function exportToCsv(filePath: string): void {
  const contacts = contactsRepo.getAllContacts()

  const data = contacts.map((contact) => {
    let emails: string[] = []
    let phones: string[] = []

    try {
      emails = JSON.parse(contact.emails)
    } catch {
      emails = []
    }

    try {
      phones = JSON.parse(contact.phones)
    } catch {
      phones = []
    }

    return {
      name: contact.name,
      email: emails[0] || '',
      company: contact.company || '',
      title: contact.title || '',
      phone: phones[0] || '',
      location: contact.location || '',
      source: contact.source || '',
      notes: contact.notes || '',
      last_contact_at: contact.last_contact_at || '',
      created_at: contact.created_at
    }
  })

  const csv = Papa.unparse(data)
  writeFileSync(filePath, csv, 'utf-8')
}

export function backupDatabase(filePath: string): void {
  const buffer = getDatabaseBuffer()
  writeFileSync(filePath, buffer)
}
