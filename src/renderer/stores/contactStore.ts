import { create } from 'zustand'

interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  emails: string
  phones: string
  location: string | null
  source: string | null
  notes: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

interface Tag {
  id: string
  name: string
  color: string
}

interface ContactStore {
  contacts: Contact[]
  tags: Tag[]
  selectedContact: Contact | null
  selectedContactTags: Tag[]
  searchQuery: string
  isLoading: boolean
  error: string | null

  // Actions
  fetchContacts: () => Promise<void>
  fetchTags: () => Promise<void>
  searchContacts: (query: string) => Promise<void>
  selectContact: (id: string | null) => Promise<void>
  createContact: (data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>) => Promise<Contact>
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>
  deleteContact: (id: string) => Promise<void>
  addTagToContact: (contactId: string, tagId: string) => Promise<void>
  removeTagFromContact: (contactId: string, tagId: string) => Promise<void>
  setSearchQuery: (query: string) => void
}

export const useContactStore = create<ContactStore>((set, get) => ({
  contacts: [],
  tags: [],
  selectedContact: null,
  selectedContactTags: [],
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchContacts: async () => {
    set({ isLoading: true, error: null })
    try {
      const contacts = await window.api.contacts.getAll()
      set({ contacts, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  fetchTags: async () => {
    try {
      const tags = await window.api.tags.getAll()
      set({ tags })
    } catch (error) {
      console.error('Failed to fetch tags:', error)
    }
  },

  searchContacts: async (query: string) => {
    set({ isLoading: true, searchQuery: query })
    try {
      const contacts = query
        ? await window.api.contacts.search(query)
        : await window.api.contacts.getAll()
      set({ contacts, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  selectContact: async (id: string | null) => {
    if (!id) {
      set({ selectedContact: null, selectedContactTags: [] })
      return
    }

    try {
      const contact = await window.api.contacts.getById(id)
      const tags = await window.api.contacts.getTags(id)
      set({ selectedContact: contact, selectedContactTags: tags })
    } catch (error) {
      console.error('Failed to select contact:', error)
    }
  },

  createContact: async (data) => {
    set({ isLoading: true })
    try {
      const contact = await window.api.contacts.create(data)
      const contacts = [...get().contacts, contact]
      set({ contacts, isLoading: false })
      return contact
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
      throw error
    }
  },

  updateContact: async (id, data) => {
    try {
      const updated = await window.api.contacts.update(id, data)
      const contacts = get().contacts.map((c) => (c.id === id ? updated : c))
      set({ contacts })
      if (get().selectedContact?.id === id) {
        set({ selectedContact: updated })
      }
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteContact: async (id) => {
    try {
      await window.api.contacts.delete(id)
      // Remove from local state
      const contacts = get().contacts.filter((c) => c.id !== id)
      set({ contacts })
      // Clear selection if deleted contact was selected
      if (get().selectedContact?.id === id) {
        set({ selectedContact: null, selectedContactTags: [] })
      }
    } catch (error) {
      console.error('Failed to delete contact:', error)
      set({ error: (error as Error).message })
      throw error
    }
  },

  addTagToContact: async (contactId, tagId) => {
    try {
      await window.api.contacts.addTag(contactId, tagId)
      if (get().selectedContact?.id === contactId) {
        const tags = await window.api.contacts.getTags(contactId)
        set({ selectedContactTags: tags })
      }
    } catch (error) {
      console.error('Failed to add tag:', error)
    }
  },

  removeTagFromContact: async (contactId, tagId) => {
    try {
      await window.api.contacts.removeTag(contactId, tagId)
      if (get().selectedContact?.id === contactId) {
        const tags = get().selectedContactTags.filter((t) => t.id !== tagId)
        set({ selectedContactTags: tags })
      }
    } catch (error) {
      console.error('Failed to remove tag:', error)
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query })
}))
