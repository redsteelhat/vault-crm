import { app, dialog, BrowserWindow } from 'electron'
import type { IpcMain } from 'electron'
import { IPC_CHANNELS } from './channels'
import * as contactsRepo from '../database/repositories/contacts'
import * as interactionsRepo from '../database/repositories/interactions'
import * as tagsRepo from '../database/repositories/tags'
import * as followupsRepo from '../database/repositories/followups'
import * as settingsRepo from '../database/repositories/settings'
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
import {
  getFeatureGates,
  getTierInfo,
  canAddContact,
  isFeatureEnabled,
  getUpgradePrompt,
  getTierComparison,
  recordUpgradePromptShown
} from '../services/feature-gates'

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
}

// Helper to send events to renderer
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send(channel, ...args)
  })
}
