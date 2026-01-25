import { app, dialog, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from './channels'
import * as contactsRepo from '../database/repositories/contacts'
import * as interactionsRepo from '../database/repositories/interactions'
import * as tagsRepo from '../database/repositories/tags'
import * as followupsRepo from '../database/repositories/followups'
import * as settingsRepo from '../database/repositories/settings'
import * as pipelinesRepo from '../database/repositories/pipelines'
import * as dealsRepo from '../database/repositories/deals'
import * as tasksRepo from '../database/repositories/tasks'
import * as customFieldsRepo from '../database/repositories/custom-fields'
import * as automationsRepo from '../database/repositories/automations'
import * as templatesRepo from '../database/repositories/templates'
import * as enrichmentService from '../services/enrichment'
import * as aiService from '../services/ai-assistant'
import * as gmailSync from '../services/gmail-sync'
import * as outlookSync from '../services/outlook-sync'
import { importCsv, previewCsv } from '../services/importer'
import { exportToCsv, backupDatabase } from '../services/exporter'
import { getDatabasePath } from '../database/sqlite/connection'
import { exportDiagnostics, getDiagnosticsSummary, logError } from '../services/diagnostics'
import { getSafeModeStatus, getAvailableBackups, restoreFromBackup, deleteDatabase, exitSafeMode } from '../services/recovery'
import { 
  getBackupConfig, 
  setBackupConfig, 
  getBackupListForUI, 
  runAutoBackup, 
  deleteBackup 
} from '../services/auto-backup'
import { seedMockData } from '../database/seed-mock-data'
import {
  getFeatureGates,
  getTierInfo,
  canAddContact,
  isFeatureEnabled,
  getUpgradePrompt,
  getTierComparison,
  recordUpgradePromptShown
} from '../services/feature-gates'
import type { 
  PipelineStage, 
  Deal, 
  Task,
  CustomFieldDefinition,
  AutomationRule,
  AutomationTriggerType
} from '../database/types'

export function registerAllHandlers(ipcMain: IpcMain): void {
  // === CONTACTS ===
  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_ALL, () => {
    return contactsRepo.getAllContacts()
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_BY_ID, (_, id: string) => {
    return contactsRepo.getContactById(id)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_CREATE, (_, data) => {
    return contactsRepo.createContact(data)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_UPDATE, (_, id: string, data) => {
    return contactsRepo.updateContact(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_DELETE, (_, id: string) => {
    return contactsRepo.deleteContact(id)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_SEARCH, (_, query: string) => {
    return contactsRepo.searchContacts(query)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_BY_TAG, (_, tagId: string) => {
    return contactsRepo.getContactsByTag(tagId)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_ADD_TAG, (_, contactId: string, tagId: string) => {
    return contactsRepo.addTagToContact(contactId, tagId)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_REMOVE_TAG, (_, contactId: string, tagId: string) => {
    return contactsRepo.removeTagFromContact(contactId, tagId)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_GET_TAGS, (_, contactId: string) => {
    return contactsRepo.getContactTags_(contactId)
  })

  ipcMain.handle(IPC_CHANNELS.CONTACTS_CHECK_DUPLICATE, (_, email: string) => {
    return contactsRepo.checkDuplicateByEmail(email)
  })

  // Additional contact handlers for smart lists
  ipcMain.handle('contacts:getStale', (_, days: number) => {
    return contactsRepo.getStaleContacts(days)
  })

  ipcMain.handle('contacts:getHotList', () => {
    return contactsRepo.getHotListContacts()
  })

  ipcMain.handle('contacts:getCount', () => {
    return contactsRepo.getContactCount()
  })

  ipcMain.handle('contacts:getSourceDistribution', () => {
    return contactsRepo.getSourceDistribution()
  })

  ipcMain.handle('contacts:getCreatedThisMonth', () => {
    return contactsRepo.getContactsCreatedThisMonth()
  })

  ipcMain.handle('contacts:getUniqueCompanies', () => {
    return contactsRepo.getUniqueCompanies()
  })

  ipcMain.handle('contacts:getUniqueSources', () => {
    return contactsRepo.getUniqueSources()
  })

  ipcMain.handle('contacts:getUniqueLocations', () => {
    return contactsRepo.getUniqueLocations()
  })

  ipcMain.handle('contacts:getWithFilters', (_, filters) => {
    return contactsRepo.getContactsWithFilters(filters)
  })

  ipcMain.handle('contacts:bulkDelete', (_, ids: string[]) => {
    return { count: contactsRepo.bulkDeleteContacts(ids) }
  })

  ipcMain.handle('contacts:bulkAddTag', (_, contactIds: string[], tagId: string) => {
    return { count: contactsRepo.bulkAddTagToContacts(contactIds, tagId) }
  })

  ipcMain.handle('contacts:bulkRemoveTag', (_, contactIds: string[], tagId: string) => {
    return { count: contactsRepo.bulkRemoveTagFromContacts(contactIds, tagId) }
  })

  // === INTERACTIONS ===
  ipcMain.handle(IPC_CHANNELS.INTERACTIONS_GET_BY_CONTACT, (_, contactId: string) => {
    return interactionsRepo.getInteractionsByContact(contactId)
  })

  ipcMain.handle(IPC_CHANNELS.INTERACTIONS_CREATE, (_, data) => {
    return interactionsRepo.createInteraction(data)
  })

  ipcMain.handle(IPC_CHANNELS.INTERACTIONS_UPDATE, (_, id: string, data) => {
    return interactionsRepo.updateInteraction(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.INTERACTIONS_DELETE, (_, id: string) => {
    return interactionsRepo.deleteInteraction(id)
  })

  ipcMain.handle('interactions:getRecent', (_, limit: number) => {
    return interactionsRepo.getRecentInteractions(limit)
  })

  ipcMain.handle('interactions:getCount', () => {
    return interactionsRepo.getInteractionCount()
  })

  ipcMain.handle('interactions:getDailyCounts', (_, days: number) => {
    return interactionsRepo.getDailyInteractionCounts(days)
  })

  ipcMain.handle('interactions:getTypeStats', () => {
    return interactionsRepo.getInteractionTypeStats()
  })

  ipcMain.handle('interactions:getMonthlyCounts', (_, months: number) => {
    return interactionsRepo.getMonthlyInteractionCounts(months)
  })

  ipcMain.handle('interactions:getContactStats', (_, contactId: string) => {
    return interactionsRepo.getContactInteractionStats(contactId)
  })

  // === TAGS ===
  ipcMain.handle(IPC_CHANNELS.TAGS_GET_ALL, () => {
    return tagsRepo.getAllTags()
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_CREATE, (_, data) => {
    return tagsRepo.createTag(data)
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_UPDATE, (_, id: string, data) => {
    return tagsRepo.updateTag(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_DELETE, (_, id: string) => {
    return tagsRepo.deleteTag(id)
  })

  ipcMain.handle('tags:getWithCounts', () => {
    return tagsRepo.getTagsWithCounts()
  })

  // === FOLLOW-UPS ===
  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_GET_ALL, () => {
    return followupsRepo.getAllFollowups()
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_GET_BY_CONTACT, (_, contactId: string) => {
    return followupsRepo.getFollowupsByContact(contactId)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_GET_DUE_TODAY, () => {
    return followupsRepo.getDueTodayFollowups()
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_GET_OVERDUE, () => {
    return followupsRepo.getOverdueFollowups()
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_GET_UPCOMING, (_, days: number) => {
    return followupsRepo.getUpcomingFollowups(days)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_CREATE, (_, data) => {
    return followupsRepo.createFollowup(data)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_UPDATE, (_, id: string, data) => {
    return followupsRepo.updateFollowup(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_MARK_DONE, (_, id: string) => {
    return followupsRepo.markFollowupDone(id)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_SNOOZE, (_, id: string, newDate: string) => {
    return followupsRepo.snoozeFollowup(id, newDate)
  })

  ipcMain.handle(IPC_CHANNELS.FOLLOWUPS_DELETE, (_, id: string) => {
    return followupsRepo.deleteFollowup(id)
  })

  ipcMain.handle('followups:getOpenCount', () => {
    return followupsRepo.getOpenFollowupsCount()
  })

  // === SETTINGS ===
  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, (_, key: string) => {
    return settingsRepo.getSetting(key)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, (_, key: string, value: string) => {
    return settingsRepo.setSetting(key, value)
  })

  ipcMain.handle(IPC_CHANNELS.SETTINGS_GET_ALL, () => {
    return settingsRepo.getAllSettings()
  })

  // === IMPORT ===
  ipcMain.handle(IPC_CHANNELS.IMPORT_SELECT_FILE, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.IMPORT_PREVIEW_CSV, async (_, filePath: string) => {
    return previewCsv(filePath)
  })

  ipcMain.handle(
    IPC_CHANNELS.IMPORT_CSV,
    async (_, filePath: string, mapping: Record<string, string>) => {
      return importCsv(filePath, mapping)
    }
  )

  // === EXPORT ===
  ipcMain.handle(
    IPC_CHANNELS.EXPORT_SELECT_SAVE_LOCATION,
    async (_, defaultName: string, filters: { name: string; extensions: string[] }[]) => {
      const result = await dialog.showSaveDialog({
        defaultPath: defaultName,
        filters
      })
      return result.canceled ? null : result.filePath
    }
  )

  ipcMain.handle(IPC_CHANNELS.EXPORT_CSV, async (_, filePath: string) => {
    return exportToCsv(filePath)
  })

  ipcMain.handle(IPC_CHANNELS.EXPORT_BACKUP, async (_, filePath: string) => {
    return backupDatabase(filePath)
  })

  // === APP ===
  ipcMain.handle(IPC_CHANNELS.APP_GET_VERSION, () => {
    return app.getVersion()
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_PLATFORM, () => {
    return process.platform
  })

  ipcMain.handle(IPC_CHANNELS.APP_GET_DATA_PATH, () => {
    return getDatabasePath()
  })

  ipcMain.handle('app:getLocale', () => {
    return app.getLocale()
  })

  // === DIAGNOSTICS ===
  ipcMain.handle('diagnostics:getSummary', () => {
    return getDiagnosticsSummary()
  })

  ipcMain.handle('diagnostics:export', async () => {
    const result = await dialog.showSaveDialog({
      defaultPath: `vaultcrm-diagnostics-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    })
    
    if (result.canceled || !result.filePath) {
      return { success: false, cancelled: true }
    }
    
    try {
      await exportDiagnostics(result.filePath)
      return { success: true, path: result.filePath }
    } catch (error) {
      logError(error as Error, 'diagnostics:export')
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('diagnostics:logError', (_, error: string, context?: string) => {
    logError(error, context)
  })

  // === RECOVERY / SAFE MODE ===
  ipcMain.handle('recovery:getSafeModeStatus', () => {
    return getSafeModeStatus()
  })

  ipcMain.handle('recovery:getBackups', () => {
    return getAvailableBackups().map(b => ({
      path: b.path,
      date: b.date.toISOString(),
      size: b.size
    }))
  })

  ipcMain.handle('recovery:restoreBackup', async (_, backupPath: string) => {
    try {
      const success = restoreFromBackup(backupPath)
      if (success) {
        exitSafeMode()
      }
      return { success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('recovery:resetDatabase', async () => {
    try {
      const success = deleteDatabase()
      if (success) {
        exitSafeMode()
      }
      return { success }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle('recovery:exitSafeMode', () => {
    exitSafeMode()
    return { success: true }
  })

  // === AUTO BACKUP ===
  ipcMain.handle('backup:getConfig', () => {
    return getBackupConfig()
  })

  ipcMain.handle('backup:setConfig', (_, config: Partial<{
    enabled: boolean
    frequency: 'daily' | 'weekly'
    maxBackups: number
  }>) => {
    setBackupConfig(config)
    return { success: true }
  })

  ipcMain.handle('backup:getList', () => {
    return getBackupListForUI()
  })

  ipcMain.handle('backup:runNow', async () => {
    return runAutoBackup()
  })

  ipcMain.handle('backup:delete', (_, backupPath: string) => {
    return { success: deleteBackup(backupPath) }
  })

  // === FEATURE GATES / PRICING ===
  ipcMain.handle('tier:getInfo', () => {
    return getTierInfo()
  })

  ipcMain.handle('tier:getGates', () => {
    return getFeatureGates()
  })

  ipcMain.handle('tier:canAddContact', () => {
    return canAddContact()
  })

  ipcMain.handle('tier:isFeatureEnabled', (_, feature: string) => {
    return isFeatureEnabled(feature as keyof ReturnType<typeof getFeatureGates>)
  })

  ipcMain.handle('tier:getUpgradePrompt', (_, feature: string) => {
    return getUpgradePrompt(feature as keyof ReturnType<typeof getFeatureGates>)
  })

  ipcMain.handle('tier:getComparison', () => {
    return getTierComparison()
  })

  ipcMain.handle('tier:recordPromptShown', (_, feature: string) => {
    recordUpgradePromptShown(feature)
    return { success: true }
  })

  // === PIPELINES ===
  ipcMain.handle('pipelines:getAll', () => {
    return pipelinesRepo.getAllPipelines()
  })

  ipcMain.handle('pipelines:getById', (_, id: string) => {
    return pipelinesRepo.getPipelineById(id)
  })

  ipcMain.handle('pipelines:getDefault', () => {
    return pipelinesRepo.getDefaultPipeline()
  })

  ipcMain.handle('pipelines:create', (_, data: { name: string; stages?: PipelineStage[] }) => {
    return pipelinesRepo.createPipeline(data)
  })

  ipcMain.handle('pipelines:update', (_, id: string, data: Partial<{ name: string; stages: PipelineStage[] }>) => {
    return pipelinesRepo.updatePipeline(id, data)
  })

  ipcMain.handle('pipelines:delete', (_, id: string) => {
    return pipelinesRepo.deletePipeline(id)
  })

  ipcMain.handle('pipelines:setDefault', (_, id: string) => {
    return pipelinesRepo.setDefaultPipeline(id)
  })

  ipcMain.handle('pipelines:getStages', (_, pipelineId: string) => {
    return pipelinesRepo.getPipelineStages(pipelineId)
  })

  ipcMain.handle('pipelines:getStats', (_, pipelineId: string) => {
    return pipelinesRepo.getPipelineStats(pipelineId)
  })

  // === DEALS ===
  ipcMain.handle('deals:getAll', (_, pipelineId?: string) => {
    return dealsRepo.getAllDeals(pipelineId)
  })

  ipcMain.handle('deals:getById', (_, id: string) => {
    return dealsRepo.getDealById(id)
  })

  ipcMain.handle('deals:getByContact', (_, contactId: string) => {
    return dealsRepo.getDealsByContact(contactId)
  })

  ipcMain.handle('deals:getByStage', (_, pipelineId: string, stage: string) => {
    return dealsRepo.getDealsByStage(pipelineId, stage)
  })

  ipcMain.handle('deals:create', (_, data: Omit<Deal, 'id' | 'created_at' | 'updated_at' | 'closed_at' | 'won' | 'deleted_at'>) => {
    return dealsRepo.createDeal(data)
  })

  ipcMain.handle('deals:update', (_, id: string, data: Partial<Deal>) => {
    return dealsRepo.updateDeal(id, data)
  })

  ipcMain.handle('deals:moveToStage', (_, id: string, stage: string) => {
    return dealsRepo.moveDealToStage(id, stage)
  })

  ipcMain.handle('deals:close', (_, id: string, won: boolean) => {
    return dealsRepo.closeDeal(id, won)
  })

  ipcMain.handle('deals:reopen', (_, id: string, stage: string) => {
    return dealsRepo.reopenDeal(id, stage)
  })

  ipcMain.handle('deals:delete', (_, id: string) => {
    dealsRepo.deleteDeal(id)
    return { success: true }
  })

  ipcMain.handle('deals:getCount', (_, pipelineId?: string) => {
    return dealsRepo.getDealCount(pipelineId)
  })

  ipcMain.handle('deals:getOpenValue', (_, pipelineId?: string) => {
    return dealsRepo.getOpenDealsValue(pipelineId)
  })

  ipcMain.handle('deals:getClosedStats', (_, pipelineId?: string, days?: number) => {
    return dealsRepo.getClosedDealsStats(pipelineId, days)
  })

  ipcMain.handle('deals:getExpectedClose', (_, pipelineId?: string) => {
    return dealsRepo.getExpectedCloseThisMonth(pipelineId)
  })

  ipcMain.handle('deals:getWeightedValue', (_, pipelineId?: string) => {
    return dealsRepo.getWeightedPipelineValue(pipelineId)
  })

  // === TASKS ===
  ipcMain.handle('tasks:getAll', () => {
    return tasksRepo.getAllTasks()
  })

  ipcMain.handle('tasks:getById', (_, id: string) => {
    return tasksRepo.getTaskById(id)
  })

  ipcMain.handle('tasks:getByContact', (_, contactId: string) => {
    return tasksRepo.getTasksByContact(contactId)
  })

  ipcMain.handle('tasks:getByDeal', (_, dealId: string) => {
    return tasksRepo.getTasksByDeal(dealId)
  })

  ipcMain.handle('tasks:getOpen', () => {
    return tasksRepo.getOpenTasks()
  })

  ipcMain.handle('tasks:getToday', () => {
    return tasksRepo.getTodayTasks()
  })

  ipcMain.handle('tasks:getOverdue', () => {
    return tasksRepo.getOverdueTasks()
  })

  ipcMain.handle('tasks:getUpcoming', (_, days?: number) => {
    return tasksRepo.getUpcomingTasks(days)
  })

  ipcMain.handle('tasks:create', (_, data: Omit<Task, 'id' | 'created_at' | 'completed_at' | 'deleted_at'>) => {
    return tasksRepo.createTask(data)
  })

  ipcMain.handle('tasks:update', (_, id: string, data: Partial<Task>) => {
    return tasksRepo.updateTask(id, data)
  })

  ipcMain.handle('tasks:complete', (_, id: string) => {
    return tasksRepo.completeTask(id)
  })

  ipcMain.handle('tasks:reopen', (_, id: string) => {
    return tasksRepo.reopenTask(id)
  })

  ipcMain.handle('tasks:cancel', (_, id: string) => {
    return tasksRepo.cancelTask(id)
  })

  ipcMain.handle('tasks:delete', (_, id: string) => {
    tasksRepo.deleteTask(id)
    return { success: true }
  })

  ipcMain.handle('tasks:getCount', () => {
    return tasksRepo.getTaskCount()
  })

  ipcMain.handle('tasks:getForAgenda', (_, date: string) => {
    return tasksRepo.getTasksForAgenda(date)
  })

  // === CUSTOM FIELDS ===
  ipcMain.handle('customFields:getDefinitions', (_, entityType?: 'contact' | 'deal' | 'task') => {
    return customFieldsRepo.getAllFieldDefinitions(entityType)
  })

  ipcMain.handle('customFields:getDefinitionById', (_, id: string) => {
    return customFieldsRepo.getFieldDefinitionById(id)
  })

  ipcMain.handle('customFields:createDefinition', (_, data: Omit<CustomFieldDefinition, 'id' | 'created_at'>) => {
    return customFieldsRepo.createFieldDefinition(data)
  })

  ipcMain.handle('customFields:updateDefinition', (_, id: string, data: Partial<CustomFieldDefinition>) => {
    return customFieldsRepo.updateFieldDefinition(id, data)
  })

  ipcMain.handle('customFields:deleteDefinition', (_, id: string) => {
    customFieldsRepo.deleteFieldDefinition(id)
    return { success: true }
  })

  ipcMain.handle('customFields:reorderDefinitions', (_, entityType: string, orderedIds: string[]) => {
    customFieldsRepo.reorderFieldDefinitions(entityType, orderedIds)
    return { success: true }
  })

  ipcMain.handle('customFields:getValues', (_, entityId: string) => {
    return customFieldsRepo.getFieldValues(entityId)
  })

  ipcMain.handle('customFields:getValuesWithDefinitions', (_, entityId: string) => {
    return customFieldsRepo.getFieldValuesWithDefinitions(entityId)
  })

  ipcMain.handle('customFields:setValue', (_, entityId: string, fieldId: string, value: string | null) => {
    customFieldsRepo.setFieldValue(entityId, fieldId, value)
    return { success: true }
  })

  ipcMain.handle('customFields:setValues', (_, entityId: string, values: Record<string, string | null>) => {
    customFieldsRepo.setFieldValues(entityId, values)
    return { success: true }
  })

  ipcMain.handle('customFields:deleteValues', (_, entityId: string) => {
    customFieldsRepo.deleteAllFieldValues(entityId)
    return { success: true }
  })

  // === AUTOMATIONS ===
  ipcMain.handle('automations:getAll', () => {
    return automationsRepo.getAllRules()
  })

  ipcMain.handle('automations:getEnabled', () => {
    return automationsRepo.getEnabledRules()
  })

  ipcMain.handle('automations:getById', (_, id: string) => {
    return automationsRepo.getRuleById(id)
  })

  ipcMain.handle('automations:getByTrigger', (_, triggerType: AutomationTriggerType) => {
    return automationsRepo.getRulesByTrigger(triggerType)
  })

  ipcMain.handle('automations:create', (_, data: Omit<AutomationRule, 'id' | 'run_count' | 'last_run_at' | 'created_at'>) => {
    return automationsRepo.createRule(data)
  })

  ipcMain.handle('automations:update', (_, id: string, data: Partial<AutomationRule>) => {
    return automationsRepo.updateRule(id, data)
  })

  ipcMain.handle('automations:toggle', (_, id: string, enabled: boolean) => {
    return automationsRepo.toggleRule(id, enabled)
  })

  ipcMain.handle('automations:delete', (_, id: string) => {
    automationsRepo.deleteRule(id)
    return { success: true }
  })

  ipcMain.handle('automations:getStats', () => {
    return automationsRepo.getRuleStats()
  })

  // === ENRICHMENT ===
  ipcMain.handle('enrichment:enrichContact', async (_, contactId: string) => {
    return enrichmentService.enrichContact(contactId)
  })

  ipcMain.handle('enrichment:batchEnrich', async (_, contactIds: string[]) => {
    const results = await enrichmentService.batchEnrichContacts(contactIds)
    return Object.fromEntries(results)
  })

  ipcMain.handle('enrichment:getFaviconUrl', (_, domain: string) => {
    return enrichmentService.getFaviconUrl(domain)
  })

  ipcMain.handle('enrichment:getLogoUrl', (_, domain: string) => {
    return enrichmentService.getLogoUrl(domain)
  })

  ipcMain.handle('enrichment:extractDomain', (_, email: string) => {
    return enrichmentService.extractDomainFromEmail(email)
  })

  ipcMain.handle('enrichment:guessCompany', (_, domain: string) => {
    return enrichmentService.guessCompanyFromDomain(domain)
  })

  // === EMAIL TEMPLATES ===
  ipcMain.handle('templates:getAll', () => {
    return templatesRepo.getAllTemplates()
  })

  ipcMain.handle('templates:getById', (_, id: string) => {
    return templatesRepo.getTemplateById(id)
  })

  ipcMain.handle('templates:create', (_, data: { name: string; subject: string; body: string; variables?: string }) => {
    return templatesRepo.createTemplate({
      ...data,
      variables: data.variables || '[]'
    })
  })

  ipcMain.handle('templates:update', (_, id: string, data: Partial<{ name: string; subject: string; body: string; variables: string }>) => {
    return templatesRepo.updateTemplate(id, data)
  })

  ipcMain.handle('templates:delete', (_, id: string) => {
    templatesRepo.deleteTemplate(id)
    return { success: true }
  })

  ipcMain.handle('templates:render', (_, templateId: string, variables: Record<string, string>) => {
    const template = templatesRepo.getTemplateById(templateId)
    if (!template) throw new Error('Template not found')
    templatesRepo.incrementTemplateUsage(templateId)
    return templatesRepo.renderTemplate(template, variables)
  })

  // === SEQUENCES ===
  ipcMain.handle('sequences:getAll', () => {
    return templatesRepo.getAllSequences()
  })

  ipcMain.handle('sequences:getById', (_, id: string) => {
    return templatesRepo.getSequenceById(id)
  })

  ipcMain.handle('sequences:create', (_, data: { name: string; steps: string; active?: number }) => {
    return templatesRepo.createSequence({
      ...data,
      active: data.active ?? 1
    })
  })

  ipcMain.handle('sequences:update', (_, id: string, data: Partial<{ name: string; steps: string; active: number }>) => {
    return templatesRepo.updateSequence(id, data)
  })

  ipcMain.handle('sequences:delete', (_, id: string) => {
    templatesRepo.deleteSequence(id)
    return { success: true }
  })

  ipcMain.handle('sequences:enroll', (_, sequenceId: string, contactId: string) => {
    return templatesRepo.enrollContact(sequenceId, contactId)
  })

  ipcMain.handle('sequences:getEnrollments', (_, sequenceId: string) => {
    return templatesRepo.getEnrollmentsBySequence(sequenceId)
  })

  ipcMain.handle('sequences:pauseEnrollment', (_, enrollmentId: string) => {
    return templatesRepo.pauseEnrollment(enrollmentId)
  })

  ipcMain.handle('sequences:cancelEnrollment', (_, enrollmentId: string) => {
    return templatesRepo.cancelEnrollment(enrollmentId)
  })

  // === EMAIL SYNC ===
  ipcMain.handle('emailSync:isGmailAvailable', () => {
    return gmailSync.isGmailSyncAvailable()
  })

  ipcMain.handle('emailSync:isOutlookAvailable', () => {
    return outlookSync.isOutlookSyncAvailable()
  })

  ipcMain.handle('emailSync:connectGmail', async () => {
    return gmailSync.startGmailAuth()
  })

  ipcMain.handle('emailSync:connectOutlook', async () => {
    return outlookSync.startOutlookAuth()
  })

  ipcMain.handle('emailSync:syncGmailEmails', async (_, accountId: string) => {
    return gmailSync.syncEmails(accountId)
  })

  ipcMain.handle('emailSync:syncGmailCalendar', async (_, accountId: string) => {
    return gmailSync.syncCalendar(accountId)
  })

  ipcMain.handle('emailSync:syncOutlookEmails', async (_, accountId: string) => {
    return outlookSync.syncEmails(accountId)
  })

  ipcMain.handle('emailSync:syncOutlookCalendar', async (_, accountId: string) => {
    return outlookSync.syncCalendar(accountId)
  })

  ipcMain.handle('emailSync:disconnectGmail', async (_, accountId: string) => {
    await gmailSync.disconnectGmailAccount(accountId)
    return { success: true }
  })

  ipcMain.handle('emailSync:disconnectOutlook', async (_, accountId: string) => {
    await outlookSync.disconnectOutlookAccount(accountId)
    return { success: true }
  })

  ipcMain.handle('emailSync:getContactEmails', (_, contactId: string, provider: 'gmail' | 'outlook') => {
    return provider === 'gmail' 
      ? gmailSync.getContactEmails(contactId)
      : outlookSync.getContactEmails(contactId)
  })

  ipcMain.handle('emailSync:getContactEvents', (_, contactId: string, provider: 'gmail' | 'outlook') => {
    return provider === 'gmail'
      ? gmailSync.getContactEvents(contactId)
      : outlookSync.getContactEvents(contactId)
  })

  // === AI ASSISTANT ===
  ipcMain.handle('ai:getConfig', () => {
    return aiService.getAIConfig()
  })

  ipcMain.handle('ai:setConfig', (_, config: Partial<{ provider: string; localEndpoint: string; openaiApiKey: string; anthropicApiKey: string; model: string }>) => {
    aiService.setAIConfig(config as Parameters<typeof aiService.setAIConfig>[0])
    return { success: true }
  })

  ipcMain.handle('ai:checkLocalAvailable', async () => {
    return aiService.checkLocalAIAvailable()
  })

  ipcMain.handle('ai:getLocalModels', async () => {
    return aiService.getLocalModels()
  })

  ipcMain.handle('ai:summarizeNotes', async (_, notes: string[]) => {
    return aiService.summarizeNotes(notes)
  })

  ipcMain.handle('ai:suggestFollowUp', async (_, context: { contactName: string; recentInteractions: string[]; lastContactDate?: string }) => {
    return aiService.suggestNextFollowUp(context)
  })

  ipcMain.handle('ai:suggestTags', async (_, notes: string, existingTags: string[]) => {
    return aiService.suggestTags(notes, existingTags)
  })

  ipcMain.handle('ai:draftEmail', async (_, context: { contactName: string; purpose: string; previousEmails?: string[]; tone?: 'formal' | 'friendly' | 'casual' }) => {
    return aiService.draftEmail(context)
  })

  ipcMain.handle('ai:meetingPrep', async (_, context: { contactName: string; company?: string; meetingPurpose?: string; recentNotes?: string[] }) => {
    return aiService.generateMeetingPrep(context)
  })

  // Dev Tools - Mock Data Seeder
  ipcMain.handle('dev:seedMockData', async () => {
    return seedMockData()
  })
}

// Helper to send events to renderer
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send(channel, ...args)
  })
}
