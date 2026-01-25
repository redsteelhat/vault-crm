import { create } from 'zustand'

interface FollowUp {
  id: string
  contact_id: string
  due_at: string
  reason: string | null
  status: 'open' | 'done' | 'snoozed'
  created_at: string
  done_at: string | null
}

interface FollowUpWithContact extends FollowUp {
  contact_name: string
  contact_company: string | null
}

interface FollowUpStore {
  followups: FollowUpWithContact[]
  dueToday: FollowUpWithContact[]
  overdue: FollowUpWithContact[]
  upcoming: FollowUpWithContact[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchDueToday: () => Promise<void>
  fetchOverdue: () => Promise<void>
  fetchUpcoming: (days?: number) => Promise<void>
  fetchByContact: (contactId: string) => Promise<FollowUp[]>
  createFollowUp: (data: Omit<FollowUp, 'id' | 'created_at' | 'done_at'>) => Promise<FollowUp>
  markDone: (id: string) => Promise<void>
  snooze: (id: string, newDate: string) => Promise<void>
  deleteFollowUp: (id: string) => Promise<void>
  refreshAll: () => Promise<void>
}

export const useFollowUpStore = create<FollowUpStore>((set, get) => ({
  followups: [],
  dueToday: [],
  overdue: [],
  upcoming: [],
  isLoading: false,
  error: null,

  fetchDueToday: async () => {
    try {
      const dueToday = await window.api.followups.getDueToday()
      set({ dueToday })
    } catch (error) {
      console.error('Failed to fetch due today:', error)
    }
  },

  fetchOverdue: async () => {
    try {
      const overdue = await window.api.followups.getOverdue()
      set({ overdue })
    } catch (error) {
      console.error('Failed to fetch overdue:', error)
    }
  },

  fetchUpcoming: async (days = 7) => {
    try {
      const upcoming = await window.api.followups.getUpcoming(days)
      set({ upcoming })
    } catch (error) {
      console.error('Failed to fetch upcoming:', error)
    }
  },

  fetchByContact: async (contactId: string) => {
    try {
      return await window.api.followups.getByContact(contactId)
    } catch (error) {
      console.error('Failed to fetch followups by contact:', error)
      return []
    }
  },

  createFollowUp: async (data) => {
    set({ isLoading: true })
    try {
      const followup = await window.api.followups.create(data)
      await get().refreshAll()
      set({ isLoading: false })
      return followup
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  markDone: async (id) => {
    try {
      await window.api.followups.markDone(id)
      await get().refreshAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  snooze: async (id, newDate) => {
    try {
      await window.api.followups.snooze(id, newDate)
      await get().refreshAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteFollowUp: async (id) => {
    try {
      await window.api.followups.delete(id)
      await get().refreshAll()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  refreshAll: async () => {
    await Promise.all([get().fetchDueToday(), get().fetchOverdue(), get().fetchUpcoming()])
  }
}))
