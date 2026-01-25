import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, mkdirSync, createWriteStream, readFileSync, readdirSync, statSync } from 'fs'
import archiver from 'archiver'
import { loadRecoveryState } from './recovery'
import { query } from '../database/sqlite/connection'
import os from 'os'

// Diagnostics file format version
const DIAGNOSTICS_VERSION = 1

// Maximum number of crash logs to include
const MAX_CRASH_LOGS = 5

// Error log storage
interface ErrorLogEntry {
  timestamp: string
  error: string
  stack?: string
  context?: string
}

const errorLog: ErrorLogEntry[] = []

// Log an error for diagnostics
export function logError(error: Error | string, context?: string): void {
  const entry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    error: error instanceof Error ? error.message : error,
    stack: error instanceof Error ? error.stack : undefined,
    context
  }
  
  errorLog.push(entry)
  
  // Keep only last 50 errors in memory
  if (errorLog.length > 50) {
    errorLog.shift()
  }
}

// Get database statistics (no PII)
function getDatabaseStats(): { contacts: number; interactions: number; followups: number; tags: number } {
  try {
    const contactsResult = query<{ count: number }>('SELECT COUNT(*) as count FROM contacts WHERE deleted_at IS NULL')
    const interactionsResult = query<{ count: number }>('SELECT COUNT(*) as count FROM interactions WHERE deleted_at IS NULL')
    const followupsResult = query<{ count: number }>('SELECT COUNT(*) as count FROM followups WHERE deleted_at IS NULL')
    const tagsResult = query<{ count: number }>('SELECT COUNT(*) as count FROM tags')
    
    return {
      contacts: contactsResult[0]?.count ?? 0,
      interactions: interactionsResult[0]?.count ?? 0,
      followups: followupsResult[0]?.count ?? 0,
      tags: tagsResult[0]?.count ?? 0
    }
  } catch {
    return { contacts: 0, interactions: 0, followups: 0, tags: 0 }
  }
}

// Get system information
function getSystemInfo(): Record<string, string | number> {
  return {
    platform: os.platform(),
    arch: os.arch(),
    osVersion: os.release(),
    nodeVersion: process.version,
    electronVersion: process.versions.electron || 'unknown',
    chromeVersion: process.versions.chrome || 'unknown',
    totalMemory: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
    freeMemory: Math.round(os.freemem() / (1024 * 1024)) + ' MB',
    cpuCores: os.cpus().length,
    uptime: Math.round(os.uptime() / 60) + ' minutes'
  }
}

// Get app information
function getAppInfo(): Record<string, string | boolean> {
  return {
    version: app.getVersion(),
    name: app.getName(),
    locale: app.getLocale(),
    isPackaged: app.isPackaged,
    userDataPath: app.getPath('userData')
  }
}

// Get recent error logs
function getRecentErrors(): ErrorLogEntry[] {
  return errorLog.slice(-MAX_CRASH_LOGS)
}

// Export diagnostics as ZIP file
export async function exportDiagnostics(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => {
      resolve()
    })

    archive.on('error', (err) => {
      reject(err)
    })

    archive.pipe(output)

    // Create diagnostics report
    const report = {
      version: DIAGNOSTICS_VERSION,
      generated_at: new Date().toISOString(),
      app: getAppInfo(),
      system: getSystemInfo(),
      database_stats: getDatabaseStats(),
      recovery_state: loadRecoveryState(),
      recent_errors: getRecentErrors(),
      note: 'This diagnostic report contains no personal data (contacts, names, emails, etc.)'
    }

    archive.append(JSON.stringify(report, null, 2), { name: 'diagnostics.json' })

    // Add system logs if available (Electron logs)
    try {
      const logsPath = app.getPath('logs')
      if (existsSync(logsPath)) {
        const logFiles = readdirSync(logsPath)
          .filter(f => f.endsWith('.log'))
          .slice(-3) // Last 3 log files
        
        for (const logFile of logFiles) {
          const logPath = join(logsPath, logFile)
          const stats = statSync(logPath)
          
          // Only include logs smaller than 1MB
          if (stats.size < 1024 * 1024) {
            archive.file(logPath, { name: `logs/${logFile}` })
          }
        }
      }
    } catch {
      // Ignore log collection errors
    }

    // Add README
    const readme = `VaultCRM Diagnostics Report
============================

This file contains diagnostic information to help troubleshoot issues.

PRIVACY NOTICE:
- No personal data (contacts, names, emails, notes) is included
- Only statistical counts and system information are collected
- You can review the contents before sharing

Contents:
- diagnostics.json: Main diagnostic data
- logs/: Application log files (if available)

Generated: ${new Date().toISOString()}
VaultCRM Version: ${app.getVersion()}
`
    archive.append(readme, { name: 'README.txt' })

    archive.finalize()
  })
}

// Get diagnostics summary (for display in UI)
export function getDiagnosticsSummary(): {
  app: Record<string, string | boolean>
  system: Record<string, string | number>
  database: { contacts: number; interactions: number; followups: number; tags: number }
  errors: number
} {
  return {
    app: getAppInfo(),
    system: getSystemInfo(),
    database: getDatabaseStats(),
    errors: errorLog.length
  }
}

// Clear error log
export function clearErrorLog(): void {
  errorLog.length = 0
}
