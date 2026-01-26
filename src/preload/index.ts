import { contextBridge, ipcRenderer } from 'electron'
import type { 
  Contact, 
  Interaction, 
  Tag, 
  FollowUp, 
  Settings,
  Pipeline,
  PipelineStage,
  Deal,
  DealWithContact,
  Task,
  TaskWithRelations,
  CustomFieldDefinition,
  CustomFieldValue,
  AutomationRule,
  AutomationTriggerType
} from '../main/database/types'

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
    getCount: (): Promise<number> => ipcRenderer.invoke('contacts:getCount'),
    getSourceDistribution: (): Promise<{ source: string; count: number }[]> =>
      ipcRenderer.invoke('contacts:getSourceDistribution'),
    getCreatedThisMonth: (): Promise<number> =>
      ipcRenderer.invoke('contacts:getCreatedThisMonth'),
    getUniqueCompanies: (): Promise<string[]> =>
      ipcRenderer.invoke('contacts:getUniqueCompanies'),
    getUniqueSources: (): Promise<string[]> =>
      ipcRenderer.invoke('contacts:getUniqueSources'),
    getUniqueLocations: (): Promise<string[]> =>
      ipcRenderer.invoke('contacts:getUniqueLocations'),
    getWithFilters: (filters: {
      search?: string
      tags?: string[]
      companies?: string[]
      sources?: string[]
      locations?: string[]
      createdFrom?: string
      createdTo?: string
      lastContactFrom?: string
      lastContactTo?: string
      sortBy?: 'name' | 'company' | 'created_at' | 'last_contact_at' | 'updated_at'
      sortOrder?: 'asc' | 'desc'
    }): Promise<Contact[]> =>
      ipcRenderer.invoke('contacts:getWithFilters', filters),
    bulkDelete: (ids: string[]): Promise<{ count: number }> =>
      ipcRenderer.invoke('contacts:bulkDelete', ids),
    bulkAddTag: (contactIds: string[], tagId: string): Promise<{ count: number }> =>
      ipcRenderer.invoke('contacts:bulkAddTag', contactIds, tagId),
    bulkRemoveTag: (contactIds: string[], tagId: string): Promise<{ count: number }> =>
      ipcRenderer.invoke('contacts:bulkRemoveTag', contactIds, tagId)
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
    getCount: (): Promise<number> => ipcRenderer.invoke('interactions:getCount'),
    getDailyCounts: (days: number): Promise<{ date: string; count: number }[]> =>
      ipcRenderer.invoke('interactions:getDailyCounts', days),
    getTypeStats: (): Promise<{ type: string; count: number }[]> =>
      ipcRenderer.invoke('interactions:getTypeStats'),
    getMonthlyCounts: (months: number): Promise<{ month: string; count: number }[]> =>
      ipcRenderer.invoke('interactions:getMonthlyCounts', months),
    getContactStats: (contactId: string): Promise<{
      monthlyData: { month: string; count: number }[]
      typeData: { type: string; count: number }[]
      total: number
    }> => ipcRenderer.invoke('interactions:getContactStats', contactId)
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

  // Pipelines
  pipelines: {
    getAll: (): Promise<Pipeline[]> => ipcRenderer.invoke('pipelines:getAll'),
    getById: (id: string): Promise<Pipeline | null> => ipcRenderer.invoke('pipelines:getById', id),
    getDefault: (): Promise<Pipeline | null> => ipcRenderer.invoke('pipelines:getDefault'),
    create: (data: { name: string; stages?: PipelineStage[] }): Promise<Pipeline> =>
      ipcRenderer.invoke('pipelines:create', data),
    update: (id: string, data: Partial<{ name: string; stages: PipelineStage[] }>): Promise<Pipeline | null> =>
      ipcRenderer.invoke('pipelines:update', id, data),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke('pipelines:delete', id),
    setDefault: (id: string): Promise<boolean> => ipcRenderer.invoke('pipelines:setDefault', id),
    getStages: (pipelineId: string): Promise<PipelineStage[]> =>
      ipcRenderer.invoke('pipelines:getStages', pipelineId),
    getStats: (pipelineId: string): Promise<{
      totalDeals: number
      totalValue: number
      byStage: { stage: string; count: number; value: number }[]
    }> => ipcRenderer.invoke('pipelines:getStats', pipelineId)
  },

  // Deals
  deals: {
    getAll: (pipelineId?: string): Promise<DealWithContact[]> =>
      ipcRenderer.invoke('deals:getAll', pipelineId),
    getById: (id: string): Promise<DealWithContact | null> =>
      ipcRenderer.invoke('deals:getById', id),
    getByContact: (contactId: string): Promise<DealWithContact[]> =>
      ipcRenderer.invoke('deals:getByContact', contactId),
    getByStage: (pipelineId: string, stage: string): Promise<DealWithContact[]> =>
      ipcRenderer.invoke('deals:getByStage', pipelineId, stage),
    create: (data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'won' | 'deleted_at'>): Promise<Deal> =>
      ipcRenderer.invoke('deals:create', data),
    update: (id: string, data: Partial<Deal>): Promise<Deal | null> =>
      ipcRenderer.invoke('deals:update', id, data),
    moveToStage: (id: string, stage: string): Promise<Deal | null> =>
      ipcRenderer.invoke('deals:moveToStage', id, stage),
    close: (id: string, won: boolean): Promise<Deal | null> =>
      ipcRenderer.invoke('deals:close', id, won),
    reopen: (id: string, stage: string): Promise<Deal | null> =>
      ipcRenderer.invoke('deals:reopen', id, stage),
    delete: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('deals:delete', id),
    getCount: (pipelineId?: string): Promise<number> =>
      ipcRenderer.invoke('deals:getCount', pipelineId),
    getOpenValue: (pipelineId?: string): Promise<number> =>
      ipcRenderer.invoke('deals:getOpenValue', pipelineId),
    getClosedStats: (pipelineId?: string, days?: number): Promise<{
      won: { count: number; value: number }
      lost: { count: number; value: number }
      winRate: number
    }> => ipcRenderer.invoke('deals:getClosedStats', pipelineId, days),
    getExpectedClose: (pipelineId?: string): Promise<DealWithContact[]> =>
      ipcRenderer.invoke('deals:getExpectedClose', pipelineId),
    getWeightedValue: (pipelineId?: string): Promise<number> =>
      ipcRenderer.invoke('deals:getWeightedValue', pipelineId)
  },

  // Tasks
  tasks: {
    getAll: (): Promise<TaskWithRelations[]> => ipcRenderer.invoke('tasks:getAll'),
    getById: (id: string): Promise<TaskWithRelations | null> =>
      ipcRenderer.invoke('tasks:getById', id),
    getByContact: (contactId: string): Promise<TaskWithRelations[]> =>
      ipcRenderer.invoke('tasks:getByContact', contactId),
    getByDeal: (dealId: string): Promise<TaskWithRelations[]> =>
      ipcRenderer.invoke('tasks:getByDeal', dealId),
    getOpen: (): Promise<TaskWithRelations[]> => ipcRenderer.invoke('tasks:getOpen'),
    getToday: (): Promise<TaskWithRelations[]> => ipcRenderer.invoke('tasks:getToday'),
    getOverdue: (): Promise<TaskWithRelations[]> => ipcRenderer.invoke('tasks:getOverdue'),
    getUpcoming: (days?: number): Promise<TaskWithRelations[]> =>
      ipcRenderer.invoke('tasks:getUpcoming', days),
    create: (data: Omit<Task, 'id' | 'created_at' | 'completed_at' | 'deleted_at'>): Promise<Task> =>
      ipcRenderer.invoke('tasks:create', data),
    update: (id: string, data: Partial<Task>): Promise<Task | null> =>
      ipcRenderer.invoke('tasks:update', id, data),
    complete: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:complete', id),
    reopen: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:reopen', id),
    cancel: (id: string): Promise<Task | null> => ipcRenderer.invoke('tasks:cancel', id),
    delete: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('tasks:delete', id),
    getCount: (): Promise<{ open: number; overdue: number; completed: number }> =>
      ipcRenderer.invoke('tasks:getCount'),
    getForAgenda: (date: string): Promise<TaskWithRelations[]> =>
      ipcRenderer.invoke('tasks:getForAgenda', date)
  },

  // Custom Fields
  customFields: {
    getDefinitions: (entityType?: 'contact' | 'deal' | 'task'): Promise<CustomFieldDefinition[]> =>
      ipcRenderer.invoke('customFields:getDefinitions', entityType),
    getDefinitionById: (id: string): Promise<CustomFieldDefinition | null> =>
      ipcRenderer.invoke('customFields:getDefinitionById', id),
    createDefinition: (data: Omit<CustomFieldDefinition, 'id' | 'created_at'>): Promise<CustomFieldDefinition> =>
      ipcRenderer.invoke('customFields:createDefinition', data),
    updateDefinition: (id: string, data: Partial<CustomFieldDefinition>): Promise<CustomFieldDefinition | null> =>
      ipcRenderer.invoke('customFields:updateDefinition', id, data),
    deleteDefinition: (id: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('customFields:deleteDefinition', id),
    reorderDefinitions: (entityType: string, orderedIds: string[]): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('customFields:reorderDefinitions', entityType, orderedIds),
    getValues: (entityId: string): Promise<CustomFieldValue[]> =>
      ipcRenderer.invoke('customFields:getValues', entityId),
    getValuesWithDefinitions: (entityId: string): Promise<(CustomFieldValue & CustomFieldDefinition)[]> =>
      ipcRenderer.invoke('customFields:getValuesWithDefinitions', entityId),
    setValue: (entityId: string, fieldId: string, value: string | null): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('customFields:setValue', entityId, fieldId, value),
    setValues: (entityId: string, values: Record<string, string | null>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('customFields:setValues', entityId, values),
    deleteValues: (entityId: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('customFields:deleteValues', entityId)
  },

  // Automations
  automations: {
    getAll: (): Promise<AutomationRule[]> => ipcRenderer.invoke('automations:getAll'),
    getEnabled: (): Promise<AutomationRule[]> => ipcRenderer.invoke('automations:getEnabled'),
    getById: (id: string): Promise<AutomationRule | null> => ipcRenderer.invoke('automations:getById', id),
    getByTrigger: (triggerType: AutomationTriggerType): Promise<AutomationRule[]> =>
      ipcRenderer.invoke('automations:getByTrigger', triggerType),
    create: (data: Omit<AutomationRule, 'id' | 'run_count' | 'last_run_at' | 'created_at'>): Promise<AutomationRule> =>
      ipcRenderer.invoke('automations:create', data),
    update: (id: string, data: Partial<AutomationRule>): Promise<AutomationRule | null> =>
      ipcRenderer.invoke('automations:update', id, data),
    toggle: (id: string, enabled: boolean): Promise<AutomationRule | null> =>
      ipcRenderer.invoke('automations:toggle', id, enabled),
    delete: (id: string): Promise<{ success: boolean }> => ipcRenderer.invoke('automations:delete', id),
    getStats: (): Promise<{
      total: number
      enabled: number
      totalRuns: number
      byTrigger: { trigger_type: string; count: number }[]
      byAction: { action_type: string; count: number }[]
    }> => ipcRenderer.invoke('automations:getStats')
  },

  // AI Assistant
  ai: {
    getConfig: (): Promise<{
      provider: 'local' | 'openai' | 'anthropic'
      localEndpoint?: string
      openaiApiKey?: string
      anthropicApiKey?: string
      model?: string
    }> => ipcRenderer.invoke('ai:getConfig'),
    setConfig: (config: Partial<{
      provider: string
      localEndpoint: string
      openaiApiKey: string
      anthropicApiKey: string
      model: string
    }>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('ai:setConfig', config),
    checkLocalAvailable: (): Promise<boolean> =>
      ipcRenderer.invoke('ai:checkLocalAvailable'),
    getLocalModels: (): Promise<string[]> =>
      ipcRenderer.invoke('ai:getLocalModels'),
    summarizeNotes: (notes: string[]): Promise<string> =>
      ipcRenderer.invoke('ai:summarizeNotes', notes),
    suggestFollowUp: (context: {
      contactName: string
      recentInteractions: string[]
      lastContactDate?: string
    }): Promise<string> =>
      ipcRenderer.invoke('ai:suggestFollowUp', context),
    suggestTags: (notes: string, existingTags: string[]): Promise<string[]> =>
      ipcRenderer.invoke('ai:suggestTags', notes, existingTags),
    draftEmail: (context: {
      contactName: string
      purpose: string
      previousEmails?: string[]
      tone?: 'formal' | 'friendly' | 'casual'
    }): Promise<{ subject: string; body: string }> =>
      ipcRenderer.invoke('ai:draftEmail', context),
    meetingPrep: (context: {
      contactName: string
      company?: string
      meetingPurpose?: string
      recentNotes?: string[]
    }): Promise<string> =>
      ipcRenderer.invoke('ai:meetingPrep', context),
    saveApiKey: (provider: 'openai' | 'anthropic', key: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('ai:saveApiKey', provider, key),
    getApiKey: (provider: 'openai' | 'anthropic'): Promise<string | null> =>
      ipcRenderer.invoke('ai:getApiKey', provider)
  },

  // Enrichment
  enrichment: {
    enrichContact: (contactId: string): Promise<{
      favicon?: string
      logo?: string
      companyName?: string
      domain?: string
    }> => ipcRenderer.invoke('enrichment:enrichContact', contactId),
    batchEnrich: (contactIds: string[]): Promise<Record<string, {
      favicon?: string
      logo?: string
      companyName?: string
      domain?: string
    }>> => ipcRenderer.invoke('enrichment:batchEnrich', contactIds),
    getFaviconUrl: (domain: string): Promise<string> =>
      ipcRenderer.invoke('enrichment:getFaviconUrl', domain),
    getLogoUrl: (domain: string): Promise<string> =>
      ipcRenderer.invoke('enrichment:getLogoUrl', domain),
    extractDomain: (email: string): Promise<string | null> =>
      ipcRenderer.invoke('enrichment:extractDomain', email),
    guessCompany: (domain: string): Promise<string> =>
      ipcRenderer.invoke('enrichment:guessCompany', domain),
    getSuggestions: (contact: { emails: string; company: string | null }): Promise<string[]> =>
      ipcRenderer.invoke('enrichment:getSuggestions', contact),
    startBatch: (contactIds: string[], options?: { concurrency?: number }): Promise<{ jobId: string }> =>
      ipcRenderer.invoke('enrichment:startBatch', contactIds, options),
    pauseBatch: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('enrichment:pauseBatch'),
    resumeBatch: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('enrichment:resumeBatch'),
    cancelBatch: (): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('enrichment:cancelBatch')
  },

  // Dev Tools
  dev: {
    seedMockData: (): Promise<{ success: boolean; stats: Record<string, number> }> =>
      ipcRenderer.invoke('dev:seedMockData')
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
      'update:error',
      'enrichment:batchProgress',
      'enrichment:batchDone',
      'enrichment:batchError'
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
