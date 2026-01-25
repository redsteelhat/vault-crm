import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { exportDiagnostics } from './diagnostics'

export interface RecoveryState {
  lastCleanExit: boolean
  crashCount: number
  lastCrashAt: string | null
  safeModeEnabled: boolean
  safeModeReason?: string
}

// Safe mode status
let isSafeModeActive = false
let safeModeReason = ''

// Get recovery state file path
function getRecoveryStatePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'recovery-state.json')
}

// Load recovery state
export function loadRecoveryState(): RecoveryState {
  const statePath = getRecoveryStatePath()
  
  const defaultState: RecoveryState = {
    lastCleanExit: true,
    crashCount: 0,
    lastCrashAt: null,
    safeModeEnabled: false
  }
  
  if (!existsSync(statePath)) {
    return defaultState
  }
  
  try {
    const data = readFileSync(statePath, 'utf-8')
    return { ...defaultState, ...JSON.parse(data) }
  } catch {
    return defaultState
  }
}

// Save recovery state
export function saveRecoveryState(state: Partial<RecoveryState>): void {
  const statePath = getRecoveryStatePath()
  const current = loadRecoveryState()
  const updated = { ...current, ...state }
  writeFileSync(statePath, JSON.stringify(updated, null, 2), 'utf-8')
}

// Mark app as starting (not clean exit)
export function markAppStarting(): void {
  saveRecoveryState({ lastCleanExit: false })
}

// Mark app as exiting cleanly
export function markAppExitingCleanly(): void {
  saveRecoveryState({ 
    lastCleanExit: true,
    crashCount: 0 // Reset crash count on clean exit
  })
}

// Increment crash count
export function incrementCrashCount(): void {
  const state = loadRecoveryState()
  saveRecoveryState({
    crashCount: state.crashCount + 1,
    lastCrashAt: new Date().toISOString()
  })
}

// Check if app crashed last time
export function didAppCrash(): boolean {
  const state = loadRecoveryState()
  return !state.lastCleanExit
}

// Check if we should enter safe mode (multiple crashes)
export function shouldEnterSafeMode(): boolean {
  const state = loadRecoveryState()
  return state.crashCount >= 3
}

// Reset crash count
export function resetCrashCount(): void {
  saveRecoveryState({ crashCount: 0 })
}

// Show recovery dialog
export async function showRecoveryDialog(parentWindow: BrowserWindow | null): Promise<'retry' | 'export' | 'reset'> {
  const result = await dialog.showMessageBox(parentWindow!, {
    type: 'warning',
    title: 'VaultCRM Recovery',
    message: 'VaultCRM did not exit cleanly',
    detail: 'The application may have crashed or was forced to close. Your data should be safe, but you can choose how to proceed.',
    buttons: ['Try Again', 'Export My Data', 'Reset Database'],
    defaultId: 0,
    cancelId: 0
  })
  
  switch (result.response) {
    case 1:
      return 'export'
    case 2:
      return 'reset'
    default:
      return 'retry'
  }
}

// Backup database before reset
export function backupDatabaseBeforeReset(): string | null {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'data', 'vaultcrm.db')
  
  if (!existsSync(dbPath)) {
    return null
  }
  
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = join(userDataPath, 'data', 'backups')
    const backupPath = join(backupDir, `vaultcrm-pre-reset-${timestamp}.db`)
    
    // Ensure backup directory exists
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true })
    }
    
    copyFileSync(dbPath, backupPath)
    console.log('Database backed up to:', backupPath)
    return backupPath
  } catch (error) {
    console.error('Failed to backup database:', error)
    return null
  }
}

// Delete database for reset
export function deleteDatabase(): boolean {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'data', 'vaultcrm.db')
  
  if (!existsSync(dbPath)) {
    return true
  }
  
  try {
    unlinkSync(dbPath)
    console.log('Database deleted for reset')
    return true
  } catch (error) {
    console.error('Failed to delete database:', error)
    return false
  }
}

// Get list of available backups
export function getAvailableBackups(): { path: string; date: Date; size: number }[] {
  const userDataPath = app.getPath('userData')
  const backupDir = join(userDataPath, 'data', 'backups')
  
  if (!existsSync(backupDir)) {
    return []
  }
  
  try {
    const files = readdirSync(backupDir) as string[]
    
    return files
      .filter((f: string) => f.endsWith('.db'))
      .map((f: string) => {
        const fullPath = join(backupDir, f)
        const stats = statSync(fullPath)
        return {
          path: fullPath,
          date: stats.mtime,
          size: stats.size
        }
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())
  } catch {
    return []
  }
}

// Restore from backup
export function restoreFromBackup(backupPath: string): boolean {
  const userDataPath = app.getPath('userData')
  const dbPath = join(userDataPath, 'data', 'vaultcrm.db')
  
  if (!existsSync(backupPath)) {
    console.error('Backup file not found:', backupPath)
    return false
  }
  
  try {
    // Backup current database first
    if (existsSync(dbPath)) {
      backupDatabaseBeforeReset()
    }
    
    copyFileSync(backupPath, dbPath)
    console.log('Database restored from:', backupPath)
    return true
  } catch (error) {
    console.error('Failed to restore database:', error)
    return false
  }
}

// Enter safe mode
export function enterSafeMode(reason: string): void {
  isSafeModeActive = true
  safeModeReason = reason
  saveRecoveryState({ safeModeEnabled: true, safeModeReason: reason })
  console.log('Entered safe mode:', reason)
}

// Exit safe mode
export function exitSafeMode(): void {
  isSafeModeActive = false
  safeModeReason = ''
  saveRecoveryState({ safeModeEnabled: false, safeModeReason: undefined })
  console.log('Exited safe mode')
}

// Check if safe mode is active
export function isSafeMode(): boolean {
  return isSafeModeActive
}

// Get safe mode reason
export function getSafeModeReason(): string {
  return safeModeReason
}

// Initialize safe mode check on app start
export function initializeSafeMode(): void {
  const state = loadRecoveryState()
  if (state.safeModeEnabled) {
    isSafeModeActive = true
    safeModeReason = state.safeModeReason || 'Previous session issue'
  }
}

// Show safe mode dialog with options
export async function showSafeModeDialog(parentWindow: BrowserWindow | null): Promise<'continue' | 'export' | 'restore' | 'reset'> {
  const backups = getAvailableBackups()
  const hasBackups = backups.length > 0
  
  const buttons = [
    'Continue in Safe Mode',
    'Export Diagnostics & Data',
    ...(hasBackups ? ['Restore from Backup'] : []),
    'Reset Database'
  ]
  
  const result = await dialog.showMessageBox(parentWindow!, {
    type: 'warning',
    title: 'VaultCRM Safe Mode',
    message: 'VaultCRM is running in Safe Mode',
    detail: `Reason: ${safeModeReason}\n\nSafe mode provides read-only access to your data. You can export your data, restore from a backup, or reset the database.`,
    buttons,
    defaultId: 0,
    cancelId: 0
  })
  
  switch (result.response) {
    case 1:
      return 'export'
    case 2:
      return hasBackups ? 'restore' : 'reset'
    case 3:
      return 'reset'
    default:
      return 'continue'
  }
}

// Handle safe mode export
export async function handleSafeModeExport(parentWindow: BrowserWindow | null): Promise<boolean> {
  try {
    const result = await dialog.showSaveDialog(parentWindow!, {
      defaultPath: `vaultcrm-safemode-export-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'ZIP Files', extensions: ['zip'] }]
    })
    
    if (result.canceled || !result.filePath) {
      return false
    }
    
    await exportDiagnostics(result.filePath)
    
    await dialog.showMessageBox(parentWindow!, {
      type: 'info',
      title: 'Export Complete',
      message: 'Diagnostics exported successfully',
      detail: `Saved to: ${result.filePath}`
    })
    
    return true
  } catch (error) {
    await dialog.showMessageBox(parentWindow!, {
      type: 'error',
      title: 'Export Failed',
      message: 'Failed to export diagnostics',
      detail: (error as Error).message
    })
    return false
  }
}

// Show backup selection dialog
export async function showBackupSelectionDialog(parentWindow: BrowserWindow | null): Promise<string | null> {
  const backups = getAvailableBackups()
  
  if (backups.length === 0) {
    await dialog.showMessageBox(parentWindow!, {
      type: 'info',
      title: 'No Backups',
      message: 'No backups available',
      detail: 'There are no backup files to restore from.'
    })
    return null
  }
  
  const buttons = backups.slice(0, 5).map((b, i) => {
    const date = new Date(b.date)
    const size = Math.round(b.size / 1024)
    return `${i + 1}. ${date.toLocaleDateString()} ${date.toLocaleTimeString()} (${size} KB)`
  })
  buttons.push('Cancel')
  
  const result = await dialog.showMessageBox(parentWindow!, {
    type: 'question',
    title: 'Select Backup',
    message: 'Choose a backup to restore',
    detail: 'Select a backup file to restore. The current database will be backed up before restoration.',
    buttons,
    defaultId: buttons.length - 1,
    cancelId: buttons.length - 1
  })
  
  if (result.response === buttons.length - 1) {
    return null
  }
  
  return backups[result.response].path
}

// Get safe mode status for renderer
export function getSafeModeStatus(): { active: boolean; reason: string; backupCount: number } {
  return {
    active: isSafeModeActive,
    reason: safeModeReason,
    backupCount: getAvailableBackups().length
  }
}
