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
}

// Helper to send events to renderer
export function sendToRenderer(channel: string, ...args: unknown[]): void {
  const windows = BrowserWindow.getAllWindows()
  windows.forEach((window) => {
    window.webContents.send(channel, ...args)
  })
}
