import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs'
import { backupDatabase } from './exporter'
import { getSetting, setSetting } from '../database/repositories/settings'

// Backup configuration
export interface BackupConfig {
  enabled: boolean
  frequency: 'daily' | 'weekly'
  maxBackups: number
  lastBackupAt: string | null
}

// Default configuration
const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  frequency: 'daily',
  maxBackups: 10,
  lastBackupAt: null
}

let backupInterval: NodeJS.Timeout | null = null
let isDbReady = false

const CHECK_INTERVAL = 60 * 60 * 1000 // Check every hour
const BACKUP_HOUR = 2 // Run backup at 2 AM

/**
 * Get backup directory path
 */
export function getBackupDir(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'backups')
}

/**
 * Ensure backup directory exists
 */
function ensureBackupDir(): void {
  const backupDir = getBackupDir()
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true })
  }
}

/**
 * Get backup configuration from settings
 */
export function getBackupConfig(): BackupConfig {
  try {
    const enabled = getSetting('auto_backup_enabled')
    const frequency = getSetting('auto_backup_frequency')
    const maxBackups = getSetting('auto_backup_max')
    const lastBackupAt = getSetting('auto_backup_last')

    return {
      enabled: enabled === null ? DEFAULT_CONFIG.enabled : enabled === 'true',
      frequency: (frequency as 'daily' | 'weekly') || DEFAULT_CONFIG.frequency,
      maxBackups: maxBackups ? parseInt(maxBackups, 10) : DEFAULT_CONFIG.maxBackups,
      lastBackupAt: lastBackupAt || null
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

/**
 * Save backup configuration to settings
 */
export function setBackupConfig(config: Partial<BackupConfig>): void {
  if (config.enabled !== undefined) {
    setSetting('auto_backup_enabled', String(config.enabled))
  }
  if (config.frequency !== undefined) {
    setSetting('auto_backup_frequency', config.frequency)
  }
  if (config.maxBackups !== undefined) {
    setSetting('auto_backup_max', String(config.maxBackups))
  }
  if (config.lastBackupAt !== undefined) {
    setSetting('auto_backup_last', config.lastBackupAt || '')
  }
}

/**
 * Check if backup is needed based on frequency and last backup time
 */
function isBackupNeeded(config: BackupConfig): boolean {
  if (!config.enabled) return false
  if (!config.lastBackupAt) return true

  const lastBackup = new Date(config.lastBackupAt)
  const now = new Date()
  const hoursSinceLastBackup = (now.getTime() - lastBackup.getTime()) / (1000 * 60 * 60)

  if (config.frequency === 'daily') {
    return hoursSinceLastBackup >= 24
  } else if (config.frequency === 'weekly') {
    return hoursSinceLastBackup >= 168 // 7 * 24
  }

  return false
}

/**
 * Get list of existing backups sorted by date (newest first)
 */
export function getExistingBackups(): { name: string; path: string; date: Date; size: number }[] {
  const backupDir = getBackupDir()
  
  if (!existsSync(backupDir)) {
    return []
  }

  const files = readdirSync(backupDir)
    .filter(f => f.startsWith('vaultcrm-auto-') && f.endsWith('.zip'))
    .map(name => {
      const filePath = join(backupDir, name)
      const stats = statSync(filePath)
      return {
        name,
        path: filePath,
        date: stats.mtime,
        size: stats.size
      }
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())

  return files
}

/**
 * Rotate old backups, keeping only the specified number
 */
function rotateBackups(maxBackups: number): void {
  const backups = getExistingBackups()
  
  if (backups.length <= maxBackups) {
    return
  }

  // Delete oldest backups
  const toDelete = backups.slice(maxBackups)
  for (const backup of toDelete) {
    try {
      unlinkSync(backup.path)
      console.log(`Deleted old backup: ${backup.name}`)
    } catch (error) {
      console.error(`Failed to delete old backup ${backup.name}:`, error)
    }
  }
}

/**
 * Generate backup filename with timestamp
 */
function generateBackupFilename(): string {
  const now = new Date()
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19)
  return `vaultcrm-auto-${timestamp}.zip`
}

/**
 * Run automatic backup
 */
export async function runAutoBackup(): Promise<{ success: boolean; path?: string; error?: string }> {
  const config = getBackupConfig()
  
  if (!config.enabled) {
    return { success: false, error: 'Auto backup is disabled' }
  }

  try {
    ensureBackupDir()
    
    const backupDir = getBackupDir()
    const filename = generateBackupFilename()
    const backupPath = join(backupDir, filename)

    console.log(`Running auto backup to: ${backupPath}`)
    
    await backupDatabase(backupPath)
    
    // Update last backup time
    setBackupConfig({ lastBackupAt: new Date().toISOString() })
    
    // Rotate old backups
    rotateBackups(config.maxBackups)
    
    console.log(`Auto backup completed: ${filename}`)
    
    return { success: true, path: backupPath }
  } catch (error) {
    console.error('Auto backup failed:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Check if it's time to run backup
 */
async function checkAndRunBackup(): Promise<void> {
  if (!isDbReady) {
    return
  }

  const now = new Date()
  const currentHour = now.getHours()

  // Only run at designated backup hour
  if (currentHour !== BACKUP_HOUR) {
    return
  }

  const config = getBackupConfig()
  
  if (isBackupNeeded(config)) {
    await runAutoBackup()
  }
}

/**
 * Start auto backup scheduler
 */
export function startAutoBackupScheduler(): void {
  console.log('Starting auto backup scheduler...')
  
  // Check periodically
  backupInterval = setInterval(checkAndRunBackup, CHECK_INTERVAL)
}

/**
 * Stop auto backup scheduler
 */
export function stopAutoBackupScheduler(): void {
  if (backupInterval) {
    clearInterval(backupInterval)
    backupInterval = null
    console.log('Auto backup scheduler stopped')
  }
}

/**
 * Set database ready state (called when vault is unlocked)
 */
export function setAutoBackupDbReady(ready: boolean): void {
  isDbReady = ready
  if (ready) {
    // Check if backup is needed immediately on unlock
    const config = getBackupConfig()
    if (isBackupNeeded(config)) {
      // Run backup after a short delay to not block unlock
      setTimeout(() => {
        runAutoBackup()
      }, 5000)
    }
  }
}

/**
 * Delete a specific backup file
 */
export function deleteBackup(backupPath: string): boolean {
  try {
    if (existsSync(backupPath)) {
      unlinkSync(backupPath)
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Get formatted backup list for UI
 */
export function getBackupListForUI(): {
  backups: Array<{
    name: string
    path: string
    date: string
    sizeKB: number
  }>
  config: BackupConfig
} {
  const backups = getExistingBackups().map(b => ({
    name: b.name,
    path: b.path,
    date: b.date.toISOString(),
    sizeKB: Math.round(b.size / 1024)
  }))

  return {
    backups,
    config: getBackupConfig()
  }
}
