import { app, dialog, BrowserWindow } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs'

export interface RecoveryState {
  lastCleanExit: boolean
  crashCount: number
  lastCrashAt: string | null
}

// Get recovery state file path
function getRecoveryStatePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'recovery-state.json')
}

// Load recovery state
export function loadRecoveryState(): RecoveryState {
  const statePath = getRecoveryStatePath()
  
  if (!existsSync(statePath)) {
    return {
      lastCleanExit: true,
      crashCount: 0,
      lastCrashAt: null
    }
  }
  
  try {
    const data = readFileSync(statePath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {
      lastCleanExit: true,
      crashCount: 0,
      lastCrashAt: null
    }
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
    const { mkdirSync } = require('fs')
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
    const { unlinkSync } = require('fs')
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
    const { readdirSync, statSync } = require('fs')
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
