import { contextBridge, ipcRenderer } from 'electron'
import type { Contact, Interaction, Tag, FollowUp, Settings } from '../main/database/types'

// API exposed to renderer
const api = {
  // Vault management
  vault: {
    isSetup: (): Promise<boolean> => ipcRenderer.invoke('vault:isSetup'),
    isLocked: (): Promise<boolean> => ipcRenderer.invoke('vault:isLocked'),
    keychainAvailable: (): Promise<boolean> => ipcRenderer.invoke('vault:keychainAvailable'),
    setup: (password: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('vault:setup', password),
    unlock: (password: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('vault:unlock', password),
    lock: (): Promise<{ success: boolean }> => ipcRenderer.invoke('vault:lock'),
    changePassword: (
      currentPassword: string,
      newPassword: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('vault:changePassword', currentPassword, newPassword),
    getIdleTimeout: (): Promise<number> => ipcRenderer.invoke('vault:getIdleTimeout'),
    setIdleTimeout: (minutes: number): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('vault:setIdleTimeout', minutes),
    getLockOnMinimize: (): Promise<boolean> => ipcRenderer.invoke('vault:getLockOnMinimize'),
    setLockOnMinimize: (enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('vault:setLockOnMinimize', enabled),
    getMigrationStatus: (): Promise<'not_needed' | 'pending' | 'completed'> =>
      ipcRenderer.invoke('vault:getMigrationStatus'),
    hasLegacyData: (): Promise<boolean> => ipcRenderer.invoke('vault:hasLegacyData')
  },

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
      ipcRenderer.invoke('contacts:checkDuplicate', email),
    getStale: (days: number): Promise<Contact[]> =>
      ipcRenderer.invoke('contacts:getStale', days),
    getHotList: (): Promise<Contact[]> => ipcRenderer.invoke('contacts:getHotList'),
    getCount: (): Promise<number> => ipcRenderer.invoke('contacts:getCount')
  },

  // Interactions
  interactions: {
    getByContact: (contactId: string): Promise<Interaction[]> =>
      ipcRenderer.invoke('interactions:getByContact', contactId),
    create: (data: Omit<Interaction, 'id' | 'created_at'>): Promise<Interaction> =>
      ipcRenderer.invoke('interactions:create', data),
    update: (id: string, data: Partial<Interaction>): Promise<Interaction> =>
      ipcRenderer.invoke('interactions:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('interactions:delete', id),
    getRecent: (limit: number): Promise<Interaction[]> =>
      ipcRenderer.invoke('interactions:getRecent', limit),
    getCount: (): Promise<number> => ipcRenderer.invoke('interactions:getCount')
  },

  // Tags
  tags: {
    getAll: (): Promise<Tag[]> => ipcRenderer.invoke('tags:getAll'),
    create: (data: Omit<Tag, 'id'>): Promise<Tag> => ipcRenderer.invoke('tags:create', data),
    update: (id: string, data: Partial<Tag>): Promise<Tag> =>
      ipcRenderer.invoke('tags:update', id, data),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('tags:delete', id),
    getWithCounts: (): Promise<(Tag & { contact_count: number })[]> =>
      ipcRenderer.invoke('tags:getWithCounts')
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
    delete: (id: string): Promise<void> => ipcRenderer.invoke('followups:delete', id),
    getOpenCount: (): Promise<number> => ipcRenderer.invoke('followups:getOpenCount')
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
    getDataPath: (): Promise<string> => ipcRenderer.invoke('app:getDataPath'),
    getLocale: (): Promise<string> => ipcRenderer.invoke('app:getLocale')
  },

  // Diagnostics
  diagnostics: {
    getSummary: (): Promise<{
      app: Record<string, string | boolean>
      system: Record<string, string | number>
      database: { contacts: number; interactions: number; followups: number; tags: number }
      errors: number
    }> => ipcRenderer.invoke('diagnostics:getSummary'),
    export: (): Promise<{ success: boolean; path?: string; cancelled?: boolean; error?: string }> =>
      ipcRenderer.invoke('diagnostics:export'),
    logError: (error: string, context?: string): Promise<void> =>
      ipcRenderer.invoke('diagnostics:logError', error, context)
  },

  // Recovery / Safe Mode
  recovery: {
    getSafeModeStatus: (): Promise<{ active: boolean; reason: string; backupCount: number }> =>
      ipcRenderer.invoke('recovery:getSafeModeStatus'),
    getBackups: (): Promise<{ path: string; date: string; size: number }[]> =>
      ipcRenderer.invoke('recovery:getBackups'),
    restoreBackup: (backupPath: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('recovery:restoreBackup', backupPath),
    resetDatabase: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('recovery:resetDatabase'),
    exitSafeMode: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('recovery:exitSafeMode')
  },

  // Tier / Feature Gates
  tier: {
    getInfo: (): Promise<{
      tier: 'free' | 'pro'
      displayName: string
      isLimited: boolean
      contactLimit: number
      contactsUsed: number
      contactsRemaining: number
      upgradeUrl: string
    }> => ipcRenderer.invoke('tier:getInfo'),
    getGates: (): Promise<{
      maxContacts: number
      csvImportEnabled: boolean
      fullCsvImport: boolean
      smartListsEnabled: boolean
      allSmartLists: boolean
      duplicateMergeEnabled: boolean
      autoBackupEnabled: boolean
      fullBackupEnabled: boolean
      exportEnabled: boolean
      fullExportEnabled: boolean
    }> => ipcRenderer.invoke('tier:getGates'),
    canAddContact: (): Promise<{ allowed: boolean; reason?: string; remaining?: number }> =>
      ipcRenderer.invoke('tier:canAddContact'),
    isFeatureEnabled: (feature: string): Promise<boolean> =>
      ipcRenderer.invoke('tier:isFeatureEnabled', feature),
    getUpgradePrompt: (feature: string): Promise<{ title: string; message: string; cta: string }> =>
      ipcRenderer.invoke('tier:getUpgradePrompt', feature),
    getComparison: (): Promise<Array<{
      feature: string
      description: string
      free: boolean | string
      pro: boolean | string
    }>> => ipcRenderer.invoke('tier:getComparison'),
    recordPromptShown: (feature: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('tier:recordPromptShown', feature)
  },

  // Auto Backup
  backup: {
    getConfig: (): Promise<{
      enabled: boolean
      frequency: 'daily' | 'weekly'
      maxBackups: number
      lastBackupAt: string | null
    }> => ipcRenderer.invoke('backup:getConfig'),
    setConfig: (config: {
      enabled?: boolean
      frequency?: 'daily' | 'weekly'
      maxBackups?: number
    }): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('backup:setConfig', config),
    getList: (): Promise<{
      backups: Array<{
        name: string
        path: string
        date: string
        sizeKB: number
      }>
      config: {
        enabled: boolean
        frequency: 'daily' | 'weekly'
        maxBackups: number
        lastBackupAt: string | null
      }
    }> => ipcRenderer.invoke('backup:getList'),
    runNow: (): Promise<{ success: boolean; path?: string; error?: string }> =>
      ipcRenderer.invoke('backup:runNow'),
    delete: (backupPath: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('backup:delete', backupPath)
  },

  // Auto-updater
  updater: {
    getStatus: (): Promise<{
      currentVersion: string
      channel: 'stable' | 'beta'
      autoCheck: boolean
      autoDownload: boolean
      lastCheck: string | null
    }> => ipcRenderer.invoke('updater:getStatus'),
    checkForUpdates: (): Promise<{ available: boolean; version?: string }> =>
      ipcRenderer.invoke('updater:checkForUpdates'),
    downloadUpdate: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('updater:downloadUpdate'),
    installUpdate: (): Promise<void> =>
      ipcRenderer.invoke('updater:installUpdate'),
    setChannel: (channel: 'stable' | 'beta'): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('updater:setChannel', channel),
    setAutoCheck: (enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('updater:setAutoCheck', enabled),
    setAutoDownload: (enabled: boolean): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('updater:setAutoDownload', enabled)
  },

  // Events
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const allowedChannels = [
      'vault:locked', 
      'followup:reminder', 
      'notification:click',
      'update:checking',
      'update:available',
      'update:not-available',
      'update:progress',
      'update:downloaded',
      'update:error'
    ]
    if (!allowedChannels.includes(channel)) {
      console.warn(`Channel ${channel} is not allowed`)
      return () => {}
    }
    
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
