import { autoUpdater, UpdateCheckResult, UpdateInfo } from 'electron-updater'
import { BrowserWindow, dialog, app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { logError } from './diagnostics'

// Update channel configuration
type UpdateChannel = 'stable' | 'beta'

interface UpdateSettings {
  channel: UpdateChannel
  autoCheck: boolean
  autoDownload: boolean
  lastCheck: string | null
  skippedVersion: string | null
}

let mainWindow: BrowserWindow | null = null

// Get update settings path
function getSettingsPath(): string {
  return join(app.getPath('userData'), 'update-settings.json')
}

// Load update settings
function loadSettings(): UpdateSettings {
  const defaultSettings: UpdateSettings = {
    channel: 'stable',
    autoCheck: true,
    autoDownload: false,
    lastCheck: null,
    skippedVersion: null
  }
  
  const settingsPath = getSettingsPath()
  if (!existsSync(settingsPath)) {
    return defaultSettings
  }
  
  try {
    const data = readFileSync(settingsPath, 'utf-8')
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch {
    return defaultSettings
  }
}

// Save update settings
function saveSettings(settings: Partial<UpdateSettings>): void {
  const current = loadSettings()
  const updated = { ...current, ...settings }
  writeFileSync(getSettingsPath(), JSON.stringify(updated, null, 2), 'utf-8')
}

// Get update settings
export function getUpdateSettings(): UpdateSettings {
  return loadSettings()
}

// Set update channel
export function setUpdateChannel(channel: UpdateChannel): void {
  saveSettings({ channel })
  
  // Update the feed URL based on channel
  const feedUrl = channel === 'beta' 
    ? 'https://beta.releases.vaultcrm.app'
    : 'https://releases.vaultcrm.app'
  
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: feedUrl,
    channel
  })
}

// Set auto-check preference
export function setAutoCheck(enabled: boolean): void {
  saveSettings({ autoCheck: enabled })
}

// Set auto-download preference
export function setAutoDownload(enabled: boolean): void {
  saveSettings({ autoDownload: enabled })
  autoUpdater.autoDownload = enabled
}

// Skip a specific version
export function skipVersion(version: string): void {
  saveSettings({ skippedVersion: version })
}

// Initialize auto-updater
export function initAutoUpdater(window: BrowserWindow): void {
  mainWindow = window
  
  const settings = loadSettings()
  
  // Configure auto-updater
  autoUpdater.autoDownload = settings.autoDownload
  autoUpdater.autoInstallOnAppQuit = true
  
  // Set feed URL based on channel
  setUpdateChannel(settings.channel)
  
  // Set up event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...')
    sendToRenderer('update:checking')
  })
  
  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info.version)
    saveSettings({ lastCheck: new Date().toISOString() })
    
    // Check if this version was skipped
    if (settings.skippedVersion === info.version) {
      console.log('Skipping version:', info.version)
      return
    }
    
    sendToRenderer('update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes
    })
    
    // Show update dialog if auto-download is disabled
    if (!settings.autoDownload) {
      showUpdateAvailableDialog(info)
    }
  })
  
  autoUpdater.on('update-not-available', () => {
    console.log('No update available')
    saveSettings({ lastCheck: new Date().toISOString() })
    sendToRenderer('update:not-available')
  })
  
  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent}%`)
    sendToRenderer('update:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })
  
  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info.version)
    sendToRenderer('update:downloaded', {
      version: info.version
    })
    
    showUpdateReadyDialog(info)
  })
  
  autoUpdater.on('error', (error) => {
    console.error('Auto-update error:', error)
    logError(error, 'auto-updater')
    sendToRenderer('update:error', {
      message: error.message
    })
  })
  
  // Check for updates on startup if enabled
  if (settings.autoCheck) {
    // Delay initial check by 10 seconds
    setTimeout(() => {
      checkForUpdates(false)
    }, 10000)
  }
}

// Check for updates
export async function checkForUpdates(showNoUpdate = true): Promise<UpdateCheckResult | null> {
  try {
    const result = await autoUpdater.checkForUpdates()
    
    if (!result?.updateInfo?.version && showNoUpdate) {
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version',
        detail: `Current version: ${app.getVersion()}`
      })
    }
    
    return result
  } catch (error) {
    console.error('Update check failed:', error)
    logError(error as Error, 'checkForUpdates')
    
    if (showNoUpdate) {
      dialog.showMessageBox(mainWindow!, {
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates',
        detail: (error as Error).message
      })
    }
    
    return null
  }
}

// Download update
export async function downloadUpdate(): Promise<void> {
  try {
    await autoUpdater.downloadUpdate()
  } catch (error) {
    console.error('Download failed:', error)
    logError(error as Error, 'downloadUpdate')
  }
}

// Install update and restart
export function installUpdate(): void {
  autoUpdater.quitAndInstall(false, true)
}

// Show update available dialog
async function showUpdateAvailableDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Available',
    message: `A new version of VaultCRM is available`,
    detail: `Version ${info.version} is ready to download.\n\nWould you like to download it now?`,
    buttons: ['Download', 'Later', 'Skip This Version'],
    defaultId: 0,
    cancelId: 1
  })
  
  switch (result.response) {
    case 0:
      downloadUpdate()
      break
    case 2:
      skipVersion(info.version)
      break
  }
}

// Show update ready dialog
async function showUpdateReadyDialog(info: UpdateInfo): Promise<void> {
  const result = await dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'Update Ready',
    message: 'Update downloaded and ready to install',
    detail: `Version ${info.version} will be installed when you restart VaultCRM.\n\nWould you like to restart now?`,
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1
  })
  
  if (result.response === 0) {
    installUpdate()
  }
}

// Send event to renderer
function sendToRenderer(channel: string, data?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

// Get update status for renderer
export function getUpdateStatus(): {
  currentVersion: string
  channel: UpdateChannel
  autoCheck: boolean
  autoDownload: boolean
  lastCheck: string | null
} {
  const settings = loadSettings()
  return {
    currentVersion: app.getVersion(),
    channel: settings.channel,
    autoCheck: settings.autoCheck,
    autoDownload: settings.autoDownload,
    lastCheck: settings.lastCheck
  }
}
