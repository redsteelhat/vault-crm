import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { createVerify, createHash } from 'crypto'

// Ed25519 public key for license verification (replace with your actual public key)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAZGVtb19wdWJsaWNfa2V5X2Zvcl90ZXN0aW5nX29ubHk=
-----END PUBLIC KEY-----`

export interface License {
  email: string
  plan: 'lifetime' | 'annual' | 'trial'
  issuedAt: string
  expiresAt: string | null // null for lifetime
  machineId?: string
  features: string[]
}

interface LicensePayload {
  email: string
  plan: string
  issued_at: string
  expires_at: string | null
  machine_id?: string
  features: string[]
  signature: string
}

// Get license file path
function getLicensePath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'license.json')
}

// Get machine ID (for machine-locked licenses)
export function getMachineId(): string {
  const os = require('os')
  const cpus = os.cpus()
  const hostname = os.hostname()
  const platform = os.platform()
  
  const machineString = `${hostname}-${platform}-${cpus[0]?.model || 'unknown'}`
  return createHash('sha256').update(machineString).digest('hex').substring(0, 16)
}

// Load license from file
export function loadLicense(): License | null {
  const licensePath = getLicensePath()
  
  if (!existsSync(licensePath)) {
    return null
  }
  
  try {
    const data = readFileSync(licensePath, 'utf-8')
    const payload: LicensePayload = JSON.parse(data)
    
    // Verify signature
    if (!verifyLicenseSignature(payload)) {
      console.warn('License signature verification failed')
      return null
    }
    
    // Check expiration
    if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
      console.warn('License has expired')
      return null
    }
    
    // Check machine ID if present
    if (payload.machine_id && payload.machine_id !== getMachineId()) {
      console.warn('License is for a different machine')
      return null
    }
    
    return {
      email: payload.email,
      plan: payload.plan as License['plan'],
      issuedAt: payload.issued_at,
      expiresAt: payload.expires_at,
      machineId: payload.machine_id,
      features: payload.features || []
    }
  } catch (error) {
    console.error('Failed to load license:', error)
    return null
  }
}

// Save license to file
export function saveLicense(licenseKey: string): { success: boolean; error?: string; license?: License } {
  try {
    // Decode base64 license key
    const decoded = Buffer.from(licenseKey, 'base64').toString('utf-8')
    const payload: LicensePayload = JSON.parse(decoded)
    
    // Verify signature
    if (!verifyLicenseSignature(payload)) {
      return { success: false, error: 'Invalid license signature' }
    }
    
    // Check expiration
    if (payload.expires_at && new Date(payload.expires_at) < new Date()) {
      return { success: false, error: 'License has expired' }
    }
    
    // Check machine ID if present
    if (payload.machine_id && payload.machine_id !== getMachineId()) {
      return { success: false, error: 'License is for a different machine' }
    }
    
    // Save license
    const licensePath = getLicensePath()
    writeFileSync(licensePath, JSON.stringify(payload, null, 2), 'utf-8')
    
    return {
      success: true,
      license: {
        email: payload.email,
        plan: payload.plan as License['plan'],
        issuedAt: payload.issued_at,
        expiresAt: payload.expires_at,
        machineId: payload.machine_id,
        features: payload.features || []
      }
    }
  } catch (error) {
    console.error('Failed to save license:', error)
    return { success: false, error: 'Invalid license format' }
  }
}

// Remove license
export function removeLicense(): void {
  const licensePath = getLicensePath()
  if (existsSync(licensePath)) {
    unlinkSync(licensePath)
  }
}

// Verify license signature
function verifyLicenseSignature(payload: LicensePayload): boolean {
  try {
    // For demo purposes, accept any license in development
    if (process.env.NODE_ENV === 'development') {
      return true
    }
    
    const { signature, ...data } = payload
    const message = JSON.stringify(data)
    
    const verify = createVerify('RSA-SHA256')
    verify.update(message)
    verify.end()
    
    return verify.verify(PUBLIC_KEY, signature, 'base64')
  } catch {
    // In development, accept all licenses
    return process.env.NODE_ENV === 'development'
  }
}

// Check if a feature is available
export function hasFeature(feature: string): boolean {
  const license = loadLicense()
  
  // Free features available to all
  const freeFeatures = ['contacts', 'followups', 'import_basic', 'export_csv']
  if (freeFeatures.includes(feature)) {
    return true
  }
  
  // Pro features require license
  if (!license) {
    return false
  }
  
  return license.features.includes(feature) || license.features.includes('all')
}

// Get license status
export function getLicenseStatus(): {
  isLicensed: boolean
  plan: string
  email: string | null
  expiresAt: string | null
  features: string[]
} {
  const license = loadLicense()
  
  if (!license) {
    return {
      isLicensed: false,
      plan: 'free',
      email: null,
      expiresAt: null,
      features: ['contacts', 'followups', 'import_basic', 'export_csv']
    }
  }
  
  return {
    isLicensed: true,
    plan: license.plan,
    email: license.email,
    expiresAt: license.expiresAt,
    features: license.features
  }
}

// Generate a demo license key (for testing)
export function generateDemoLicense(email: string): string {
  const payload = {
    email,
    plan: 'lifetime',
    issued_at: new Date().toISOString(),
    expires_at: null,
    features: ['all'],
    signature: 'demo_signature'
  }
  
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}
