import keytar from 'keytar'
import { randomBytes, createHash } from 'crypto'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { generateSalt, rekeyDatabase } from '../database/sqlite/connection'

const SERVICE_NAME = 'VaultCRM'
const ACCOUNT_DB_KEY = 'db-encryption-key'
const ACCOUNT_SALT = 'password-salt'
const ACCOUNT_PASSWORD_HASH = 'password-hash'

interface VaultConfig {
  salt: string
  passwordHash: string
  idleTimeout: number // minutes
  lockOnMinimize: boolean
  createdAt: string
}

// Get vault config path
function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'vault-config.json')
}

// Load vault config
export function loadVaultConfig(): VaultConfig | null {
  const configPath = getConfigPath()
  if (!existsSync(configPath)) {
    return null
  }
  try {
    const data = readFileSync(configPath, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

// Save vault config
function saveVaultConfig(config: VaultConfig): void {
  const configPath = getConfigPath()
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

// Check if vault is set up (has master password)
export function isVaultSetup(): boolean {
  return loadVaultConfig() !== null
}

// Hash password for verification
function hashPassword(password: string, salt: Buffer): string {
  return createHash('sha256')
    .update(password)
    .update(salt)
    .digest('hex')
}

// Set up vault with master password (first time setup)
export async function setupVault(masterPassword: string): Promise<Buffer> {
  // Generate salt for password derivation
  const salt = generateSalt()
  
  // Generate database encryption key
  const dbKey = randomBytes(32) // 256-bit key
  
  // Derive password hash for verification
  const passwordHash = hashPassword(masterPassword, salt)
  
  // Store the db key in OS keychain (encrypted by OS)
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_DB_KEY, dbKey.toString('base64'))
  
  // Save vault config
  const config: VaultConfig = {
    salt: salt.toString('base64'),
    passwordHash,
    idleTimeout: 15, // 15 minutes default
    lockOnMinimize: false,
    createdAt: new Date().toISOString()
  }
  saveVaultConfig(config)
  
  console.log('Vault setup complete')
  return dbKey
}

// Unlock vault with master password
export async function unlockVault(masterPassword: string): Promise<Buffer> {
  const config = loadVaultConfig()
  if (!config) {
    throw new Error('VAULT_NOT_SETUP')
  }
  
  const salt = Buffer.from(config.salt, 'base64')
  const passwordHash = hashPassword(masterPassword, salt)
  
  // Verify password
  if (passwordHash !== config.passwordHash) {
    throw new Error('INVALID_PASSWORD')
  }
  
  // Get db key from keychain
  const dbKeyBase64 = await keytar.getPassword(SERVICE_NAME, ACCOUNT_DB_KEY)
  if (!dbKeyBase64) {
    throw new Error('KEY_NOT_FOUND')
  }
  
  return Buffer.from(dbKeyBase64, 'base64')
}

// Change master password and rekey database
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const config = loadVaultConfig()
  if (!config) {
    throw new Error('VAULT_NOT_SETUP')
  }
  
  const salt = Buffer.from(config.salt, 'base64')
  const currentHash = hashPassword(currentPassword, salt)
  
  // Verify current password
  if (currentHash !== config.passwordHash) {
    throw new Error('INVALID_PASSWORD')
  }
  
  // Generate new database encryption key
  const newDbKey = randomBytes(32)
  
  // Rekey the database with new key (atomic operation)
  rekeyDatabase(newDbKey)
  
  // Store new db key in keychain
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_DB_KEY, newDbKey.toString('base64'))
  
  // Generate new salt and hash for new password
  const newSalt = generateSalt()
  const newPasswordHash = hashPassword(newPassword, newSalt)
  
  // Update config
  config.salt = newSalt.toString('base64')
  config.passwordHash = newPasswordHash
  saveVaultConfig(config)
  
  console.log('Password changed and database rekeyed successfully')
}

// Get idle timeout setting
export function getIdleTimeout(): number {
  const config = loadVaultConfig()
  return config?.idleTimeout ?? 15
}

// Set idle timeout
export function setIdleTimeout(minutes: number): void {
  const config = loadVaultConfig()
  if (config) {
    config.idleTimeout = minutes
    saveVaultConfig(config)
  }
}

// Get lock on minimize setting
export function getLockOnMinimize(): boolean {
  const config = loadVaultConfig()
  return config?.lockOnMinimize ?? false
}

// Set lock on minimize
export function setLockOnMinimize(enabled: boolean): void {
  const config = loadVaultConfig()
  if (config) {
    config.lockOnMinimize = enabled
    saveVaultConfig(config)
  }
}

// Delete vault (for reset/recovery)
export async function deleteVault(): Promise<void> {
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_DB_KEY)
  
  const configPath = getConfigPath()
  if (existsSync(configPath)) {
    const { unlinkSync } = await import('fs')
    unlinkSync(configPath)
  }
  
  console.log('Vault deleted')
}

// Check if keychain is available
export async function isKeychainAvailable(): Promise<boolean> {
  try {
    // Try to access keychain
    await keytar.findCredentials(SERVICE_NAME)
    return true
  } catch {
    return false
  }
}
