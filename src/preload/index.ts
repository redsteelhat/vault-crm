import { contextBridge, ipcRenderer } from 'electron'
import type { Contact, Interaction, Tag, FollowUp, Settings } from '../main/database/types'

// API exposed to renderer
const api = {
  // Contacts
  contacts: {
    getAll: (): Promise<Contact[]> => ipcRenderer.invoke('contacts:getAll'),
    getById: (id: string): Promise<Contact | null> => ipcRenderer.invoke('contacts:getById', id),
    create: (data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> =>
      ipcRenderer.invoke('contacts:create', data),
    update: (id: string, data: Partial<Contact>): Promise<Contact> =>
      ipcRenderer.invoke('contacts:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('contacts:delete', id),
    search: (query: string): Promise<Contact[]> => ipcRenderer.invoke('contacts:search', query),
    getByTag: (tagId: string): Promise<Contact[]> => ipcRenderer.invoke('contacts:getByTag', tagId),
    addTag: (contactId: string, tagId: string): Promise<void> =>
      ipcRenderer.invoke('contacts:addTag', contactId, tagId),
    removeTag: (contactId: string, tagId: string): Promise<void> =>
      ipcRenderer.invoke('contacts:removeTag', contactId, tagId),
    getTags: (contactId: string): Promise<Tag[]> =>
      ipcRenderer.invoke('contacts:getTags', contactId),
    checkDuplicate: (email: string): Promise<Contact | null> =>
      ipcRenderer.invoke('contacts:checkDuplicate', email)
  },

  // Interactions
  interactions: {
    getByContact: (contactId: string): Promise<Interaction[]> =>
      ipcRenderer.invoke('interactions:getByContact', contactId),
    create: (data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> =>
      ipcRenderer.invoke('interactions:create', data),
    update: (id: string, data: Partial<Interaction>): Promise<Interaction> =>
      ipcRenderer.invoke('interactions:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('interactions:delete', id)
  },

  // Tags
  tags: {
    getAll: (): Promise<Tag[]> => ipcRenderer.invoke('tags:getAll'),
    create: (data: Omit<Tag, 'id'>): Promise<Tag> => ipcRenderer.invoke('tags:create', data),
    update: (id: string, data: Partial<Tag>): Promise<Tag> =>
      ipcRenderer.invoke('tags:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tags:delete', id)
  },

  // Follow-ups
  followups: {
    getAll: (): Promise<FollowUp[]> => ipcRenderer.invoke('followups:getAll'),
    getByContact: (contactId: string): Promise<FollowUp[]> =>
      ipcRenderer.invoke('followups:getByContact', contactId),
    getDueToday: (): Promise<FollowUp[]> => ipcRenderer.invoke('followups:getDueToday'),
    getOverdue: (): Promise<FollowUp[]> => ipcRenderer.invoke('followups:getOverdue'),
    getUpcoming: (days: number): Promise<FollowUp[]> =>
      ipcRenderer.invoke('followups:getUpcoming', days),
    create: (data: Omit<FollowUp, 'id' | 'created_at' | 'done_at'>): Promise<FollowUp> =>
      ipcRenderer.invoke('followups:create', data),
    update: (id: string, data: Partial<FollowUp>): Promise<FollowUp> =>
      ipcRenderer.invoke('followups:update', id, data),
    markDone: (id: string): Promise<FollowUp> => ipcRenderer.invoke('followups:markDone', id),
    snooze: (id: string, newDate: string): Promise<FollowUp> =>
      ipcRenderer.invoke('followups:snooze', id, newDate),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('followups:delete', id)
  },

  // Settings
  settings: {
    get: (key: string): Promise<string | null> => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string): Promise<void> =>
      ipcRenderer.invoke('settings:set', key, value),
    getAll: (): Promise<Settings[]> => ipcRenderer.invoke('settings:getAll')
  },

  // Import/Export
  import: {
    csv: (
      filePath: string,
      mapping: Record<string, string>
    ): Promise<{ imported: number; skipped: number; errors: string[] }> =>
      ipcRenderer.invoke('import:csv', filePath, mapping),
    selectFile: (): Promise<string | null> => ipcRenderer.invoke('import:selectFile'),
    previewCsv: (
      filePath: string
    ): Promise<{ headers: string[]; rows: Record<string, string>[] }> =>
      ipcRenderer.invoke('import:previewCsv', filePath)
  },

  export: {
    csv: (filePath: string): Promise<void> => ipcRenderer.invoke('export:csv', filePath),
    backup: (filePath: string): Promise<void> => ipcRenderer.invoke('export:backup', filePath),
    selectSaveLocation: (
      defaultName: string,
      filters: { name: string; extensions: string[] }[]
    ): Promise<string | null> =>
      ipcRenderer.invoke('export:selectSaveLocation', defaultName, filters)
  },

  // App info
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion'),
    getPlatform: (): Promise<string> => ipcRenderer.invoke('app:getPlatform'),
    getDataPath: (): Promise<string> => ipcRenderer.invoke('app:getDataPath')
  },

  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => {
      ipcRenderer.removeListener(channel, subscription)
    }
  }
}

// Expose API to renderer
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose API:', error)
  }
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.api = api
}

// Type declaration for renderer
export type ElectronAPI = typeof api
