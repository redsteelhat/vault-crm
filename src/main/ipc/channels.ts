// IPC Channel Constants
export const IPC_CHANNELS = {
  // Contacts
  CONTACTS_GET_ALL: 'contacts:getAll',
  CONTACTS_GET_BY_ID: 'contacts:getById',
  CONTACTS_CREATE: 'contacts:create',
  CONTACTS_UPDATE: 'contacts:update',
  CONTACTS_DELETE: 'contacts:delete',
  CONTACTS_SEARCH: 'contacts:search',
  CONTACTS_GET_BY_TAG: 'contacts:getByTag',
  CONTACTS_ADD_TAG: 'contacts:addTag',
  CONTACTS_REMOVE_TAG: 'contacts:removeTag',
  CONTACTS_GET_TAGS: 'contacts:getTags',
  CONTACTS_CHECK_DUPLICATE: 'contacts:checkDuplicate',

  // Interactions
  INTERACTIONS_GET_BY_CONTACT: 'interactions:getByContact',
  INTERACTIONS_CREATE: 'interactions:create',
  INTERACTIONS_UPDATE: 'interactions:update',
  INTERACTIONS_DELETE: 'interactions:delete',

  // Tags
  TAGS_GET_ALL: 'tags:getAll',
  TAGS_CREATE: 'tags:create',
  TAGS_UPDATE: 'tags:update',
  TAGS_DELETE: 'tags:delete',

  // Follow-ups
  FOLLOWUPS_GET_ALL: 'followups:getAll',
  FOLLOWUPS_GET_BY_CONTACT: 'followups:getByContact',
  FOLLOWUPS_GET_DUE_TODAY: 'followups:getDueToday',
  FOLLOWUPS_GET_OVERDUE: 'followups:getOverdue',
  FOLLOWUPS_GET_UPCOMING: 'followups:getUpcoming',
  FOLLOWUPS_CREATE: 'followups:create',
  FOLLOWUPS_UPDATE: 'followups:update',
  FOLLOWUPS_MARK_DONE: 'followups:markDone',
  FOLLOWUPS_SNOOZE: 'followups:snooze',
  FOLLOWUPS_DELETE: 'followups:delete',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_ALL: 'settings:getAll',

  // Import
  IMPORT_CSV: 'import:csv',
  IMPORT_SELECT_FILE: 'import:selectFile',
  IMPORT_PREVIEW_CSV: 'import:previewCsv',

  // Export
  EXPORT_CSV: 'export:csv',
  EXPORT_BACKUP: 'export:backup',
  EXPORT_SELECT_SAVE_LOCATION: 'export:selectSaveLocation',

  // App
  APP_GET_VERSION: 'app:getVersion',
  APP_GET_PLATFORM: 'app:getPlatform',
  APP_GET_DATA_PATH: 'app:getDataPath',

  // Events (main -> renderer)
  FOLLOWUP_REMINDER: 'event:followupReminder'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
