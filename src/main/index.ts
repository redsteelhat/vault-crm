import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { initDatabase, closeDatabase, databaseExists } from './database/sqlite/connection'
import { 
  isVaultSetup, 
  setupVault, 
  unlockVault, 
  changePassword,
  getIdleTimeout,
  setIdleTimeout,
  getLockOnMinimize,
  setLockOnMinimize,
  isKeychainAvailable
} from './services/keychain'
import { legacyDatabaseExists, migrateFromJson, getMigrationStatus } from './database/legacy/json-migrator'
import { registerAllHandlers } from './ipc/handlers'
import { startScheduler, stopScheduler, setDbReady } from './services/scheduler'
import { setLastCleanExit } from './database/repositories/settings'
import { 
  initAutoUpdater, 
  checkForUpdates, 
  downloadUpdate, 
  installUpdate,
  getUpdateStatus,
  setUpdateChannel,
  setAutoCheck,
  setAutoDownload
} from './services/updater'

let mainWindow: BrowserWindow | null = null
let isUnlocked = false
let idleTimer: NodeJS.Timeout | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Block navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault()
    }
  })

  // Reset idle timer on user activity
  mainWindow.on('focus', resetIdleTimer)
  
  mainWindow.on('blur', () => {
    if (getLockOnMinimize() && isUnlocked) {
      lockVault()
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Set up CSP headers for production
function setupCSP(): void {
  if (!is.dev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data:",
            "font-src 'self'"
          ].join('; ')
        }
      })
    })
  }
}

// Lock the vault
function lockVault(): void {
  isUnlocked = false
  clearIdleTimer()
  mainWindow?.webContents.send('vault:locked')
}

// Reset idle timer
function resetIdleTimer(): void {
  clearIdleTimer()
  
  if (isUnlocked) {
    const timeout = getIdleTimeout() * 60 * 1000 // minutes to ms
    if (timeout > 0) {
      idleTimer = setTimeout(() => {
        lockVault()
      }, timeout)
    }
  }
}

// Clear idle timer
function clearIdleTimer(): void {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
}

// Register vault-related IPC handlers
function registerVaultHandlers(): void {
  // Check if vault is set up
  ipcMain.handle('vault:isSetup', () => {
    return isVaultSetup()
  })
  
  // Check if vault is locked
  ipcMain.handle('vault:isLocked', () => {
    return !isUnlocked
  })
  
  // Check keychain availability
  ipcMain.handle('vault:keychainAvailable', async () => {
    return await isKeychainAvailable()
  })
  
  // Set up vault with master password (first time)
  ipcMain.handle('vault:setup', async (_, password: string) => {
    try {
      const key = await setupVault(password)
      await initDatabase(key)
      
      // Check for legacy data migration
      if (legacyDatabaseExists()) {
        const result = migrateFromJson()
        if (!result.success) {
          console.warn('Migration had issues:', result.error)
        }
      }
      
      isUnlocked = true
      resetIdleTimer()
      setLastCleanExit(false)
      setDbReady(true)
      
      return { success: true }
    } catch (error) {
      console.error('Vault setup failed:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Unlock vault with password
  ipcMain.handle('vault:unlock', async (_, password: string) => {
    try {
      const key = await unlockVault(password)
      await initDatabase(key)
      
      isUnlocked = true
      resetIdleTimer()
      setLastCleanExit(false)
      setDbReady(true)
      
      return { success: true }
    } catch (error) {
      console.error('Vault unlock failed:', error)
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Lock vault
  ipcMain.handle('vault:lock', () => {
    lockVault()
    setDbReady(false)
    closeDatabase()
    return { success: true }
  })
  
  // Change password
  ipcMain.handle('vault:changePassword', async (_, currentPassword: string, newPassword: string) => {
    try {
      await changePassword(currentPassword, newPassword)
      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
  
  // Get/Set idle timeout
  ipcMain.handle('vault:getIdleTimeout', () => {
    return getIdleTimeout()
  })
  
  ipcMain.handle('vault:setIdleTimeout', (_, minutes: number) => {
    setIdleTimeout(minutes)
    resetIdleTimer()
    return { success: true }
  })
  
  // Get/Set lock on minimize
  ipcMain.handle('vault:getLockOnMinimize', () => {
    return getLockOnMinimize()
  })
  
  ipcMain.handle('vault:setLockOnMinimize', (_, enabled: boolean) => {
    setLockOnMinimize(enabled)
    return { success: true }
  })
  
  // Get migration status
  ipcMain.handle('vault:getMigrationStatus', () => {
    return getMigrationStatus()
  })
  
  // Check if legacy data exists
  ipcMain.handle('vault:hasLegacyData', () => {
    return legacyDatabaseExists()
  })
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.vaultcrm.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set up CSP
  setupCSP()
  
  // Register vault handlers (before window creation)
  registerVaultHandlers()
  
  // Register other IPC handlers
  registerAllHandlers(ipcMain)

  // Start follow-up scheduler (will only work when unlocked)
  startScheduler()

  // Register update handlers
  registerUpdateHandlers()

  createWindow()

  // Initialize auto-updater after window is created
  if (!is.dev && mainWindow) {
    initAutoUpdater(mainWindow)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Register update-related IPC handlers
function registerUpdateHandlers(): void {
  ipcMain.handle('updater:getStatus', () => {
    return getUpdateStatus()
  })

  ipcMain.handle('updater:checkForUpdates', async () => {
    const result = await checkForUpdates(true)
    return result ? { available: true, version: result.updateInfo?.version } : { available: false }
  })

  ipcMain.handle('updater:downloadUpdate', async () => {
    await downloadUpdate()
    return { success: true }
  })

  ipcMain.handle('updater:installUpdate', () => {
    installUpdate()
  })

  ipcMain.handle('updater:setChannel', (_, channel: 'stable' | 'beta') => {
    setUpdateChannel(channel)
    return { success: true }
  })

  ipcMain.handle('updater:setAutoCheck', (_, enabled: boolean) => {
    setAutoCheck(enabled)
    return { success: true }
  })

  ipcMain.handle('updater:setAutoDownload', (_, enabled: boolean) => {
    setAutoDownload(enabled)
    return { success: true }
  })
}

app.on('window-all-closed', () => {
  stopScheduler()
  clearIdleTimer()
  
  if (isUnlocked) {
    try {
      setLastCleanExit(true)
    } catch {
      // Ignore if db is closed
    }
  }
  
  closeDatabase()
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error)
})
