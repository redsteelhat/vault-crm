import { v4 as uuid } from 'uuid'
import { getAllFromTable, getById, insert, update, remove, saveDatabase } from '../connection'
import type { Interaction, InteractionWithContact } from '../types'
import { getContactById, updateContact } from './contacts'

export function getInteractionsByContact(contactId: string): Interaction[] {
  return getAllFromTable<Interaction>('interactions')
    .filter(i => i.contact_id === contactId)
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
}

export function getInteractionById(id: string): Interaction | null {
  return getById<Interaction>('interactions', id)
}

export function createInteraction(data: Omit<Interaction, 'id' | 'created_at'>): Interaction {
  const now = new Date().toISOString()
  const interaction: Interaction = {
    id: `interaction_${uuid()}`,
    contact_id: data.contact_id,
    type: data.type,
    body: data.body,
    occurred_at: data.occurred_at,
    created_at: now
  }
  
  insert('interactions', interaction)
  
  // Update contact's last_contact_at
  const contact = getContactById(data.contact_id)
  if (contact && (!contact.last_contact_at || contact.last_contact_at < data.occurred_at)) {
    updateContact(data.contact_id, { last_contact_at: data.occurred_at })
  }
  
  return interaction
}

export function updateInteraction(id: string, data: Partial<Interaction>): Interaction {
  const updated = update<Interaction>('interactions', id, data)
  if (!updated) throw new Error('Interaction not found')
  return updated
}

export function deleteInteraction(id: string): void {
  remove('interactions', id)
}

export function getRecentInteractions(limit: number = 20): InteractionWithContact[] {
  const interactions = getAllFromTable<Interaction>('interactions')
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
    .slice(0, limit)
  
  return interactions.map(i => {
    const contact = getContactById(i.contact_id)
    return {
      ...i,
      contact_name: contact?.name || 'Unknown',
      contact_company: contact?.company || null
    }
  })
}

export function getInteractionCount(): number {
  return getAllFromTable<Interaction>('interactions').length
}

export function getInteractionCountByContact(contactId: string): number {
  return getInteractionsByContact(contactId).length
}
