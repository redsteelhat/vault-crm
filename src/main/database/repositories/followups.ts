import { v4 as uuid } from 'uuid'
import { getAllFromTable, getById, insert, update, remove } from '../connection'
import type { FollowUp, FollowUpWithContact } from '../types'
import { getContactById } from './contacts'

export function getAllFollowups(): FollowUp[] {
  return getAllFromTable<FollowUp>('followups').sort((a, b) => a.due_at.localeCompare(b.due_at))
}

export function getFollowupById(id: string): FollowUp | null {
  return getById<FollowUp>('followups', id)
}

export function getFollowupsByContact(contactId: string): FollowUp[] {
  return getAllFollowups().filter(f => f.contact_id === contactId)
}

function addContactInfo(followups: FollowUp[]): FollowUpWithContact[] {
  return followups.map(f => {
    const contact = getContactById(f.contact_id)
    return {
      ...f,
      contact_name: contact?.name || 'Unknown',
      contact_company: contact?.company || null
    }
  })
}

export function getDueTodayFollowups(): FollowUpWithContact[] {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString()
  
  const followups = getAllFollowups().filter(f => 
    f.status === 'open' && f.due_at >= startOfDay && f.due_at <= endOfDay
  )
  return addContactInfo(followups)
}

export function getOverdueFollowups(): FollowUpWithContact[] {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  
  const followups = getAllFollowups().filter(f => 
    f.status === 'open' && f.due_at < startOfDay
  )
  return addContactInfo(followups)
}

export function getUpcomingFollowups(days: number): FollowUpWithContact[] {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + days)
  const endDate = new Date(futureDate.getFullYear(), futureDate.getMonth(), futureDate.getDate(), 23, 59, 59, 999).toISOString()
  
  const followups = getAllFollowups().filter(f => 
    f.status === 'open' && f.due_at > startOfDay && f.due_at <= endDate
  )
  return addContactInfo(followups)
}

export function getOpenFollowups(): FollowUpWithContact[] {
  const followups = getAllFollowups().filter(f => f.status === 'open')
  return addContactInfo(followups)
}

export function createFollowup(data: Omit<FollowUp, 'id' | 'created_at' | 'done_at'>): FollowUp {
  const now = new Date().toISOString()
  const followup: FollowUp = {
    id: `followup_${uuid()}`,
    contact_id: data.contact_id,
    due_at: data.due_at,
    reason: data.reason || null,
    status: data.status || 'open',
    created_at: now,
    done_at: null
  }
  return insert('followups', followup)
}

export function updateFollowup(id: string, data: Partial<FollowUp>): FollowUp {
  const updated = update<FollowUp>('followups', id, data)
  if (!updated) throw new Error('Follow-up not found')
  return updated
}

export function markFollowupDone(id: string): FollowUp {
  const now = new Date().toISOString()
  return updateFollowup(id, { status: 'done', done_at: now })
}

export function snoozeFollowup(id: string, newDate: string): FollowUp {
  return updateFollowup(id, { status: 'open', due_at: newDate })
}

export function deleteFollowup(id: string): void {
  remove('followups', id)
}

export function getFollowupCount(): { open: number; overdue: number; dueToday: number } {
  const today = new Date()
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString()
  
  const all = getAllFollowups()
  const open = all.filter(f => f.status === 'open').length
  const overdue = all.filter(f => f.status === 'open' && f.due_at < startOfDay).length
  const dueToday = all.filter(f => f.status === 'open' && f.due_at >= startOfDay && f.due_at <= endOfDay).length
  
  return { open, overdue, dueToday }
}
