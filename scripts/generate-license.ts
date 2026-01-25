/**
 * VaultCRM License Key Generator
 * 
 * Generates signed license keys for VaultCRM.
 * 
 * Usage:
 *   npx tsx scripts/generate-license.ts --email=user@example.com --plan=lifetime
 *   npx tsx scripts/generate-license.ts --email=user@example.com --plan=annual --expires=2027-01-25
 *   npx tsx scripts/generate-license.ts --email=user@example.com --plan=trial
 * 
 * Options:
 *   --email       Required. Customer email address
 *   --plan        Required. License plan: lifetime, annual, trial
 *   --expires     Optional. Expiration date (YYYY-MM-DD) for annual/trial
 *   --machine     Optional. Machine ID for device-locked licenses
 *   --features    Optional. Comma-separated feature list (default: all)
 *   --output      Optional. Output file path (default: stdout)
 */

import { generateKeyPairSync, createSign, randomBytes, createHash } from 'crypto'
import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

// License configuration
interface LicensePayload {
  email: string
  plan: 'lifetime' | 'annual' | 'trial'
  issued_at: string
  expires_at: string | null
  machine_id?: string
  features: string[]
  signature?: string
}

// Key pair paths (relative to scripts directory)
const KEYS_DIR = join(__dirname, '..', '.keys')
const PRIVATE_KEY_PATH = join(KEYS_DIR, 'license-private.pem')
const PUBLIC_KEY_PATH = join(KEYS_DIR, 'license-public.pem')

// Generate or load key pair
function ensureKeyPair(): { privateKey: string; publicKey: string } {
  if (existsSync(PRIVATE_KEY_PATH) && existsSync(PUBLIC_KEY_PATH)) {
    return {
      privateKey: readFileSync(PRIVATE_KEY_PATH, 'utf-8'),
      publicKey: readFileSync(PUBLIC_KEY_PATH, 'utf-8')
    }
  }

  console.log('Generating new Ed25519 key pair...')
  
  const { privateKey, publicKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })

  // Create keys directory if needed
  const { mkdirSync } = require('fs')
  if (!existsSync(KEYS_DIR)) {
    mkdirSync(KEYS_DIR, { recursive: true })
  }

  writeFileSync(PRIVATE_KEY_PATH, privateKey, 'utf-8')
  writeFileSync(PUBLIC_KEY_PATH, publicKey, 'utf-8')
  
  console.log('Key pair generated and saved to .keys/')
  console.log('IMPORTANT: Copy the public key to src/main/services/license.ts')
  console.log('IMPORTANT: Keep the private key secure and never commit it!')
  
  return { privateKey, publicKey }
}

// Sign the license payload
function signLicense(payload: Omit<LicensePayload, 'signature'>, privateKey: string): string {
  const message = JSON.stringify(payload)
  const sign = createSign('sha256')
  sign.update(message)
  sign.end()
  return sign.sign(privateKey, 'base64')
}

// Calculate trial expiration (14 days from now)
function getTrialExpiration(): string {
  const date = new Date()
  date.setDate(date.getDate() + 14)
  return date.toISOString().split('T')[0]
}

// Calculate annual expiration (1 year from now)
function getAnnualExpiration(): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  return date.toISOString().split('T')[0]
}

// Parse command line arguments
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {}
  
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      args[key] = value || 'true'
    }
  }
  
  return args
}

// Validate arguments
function validateArgs(args: Record<string, string>): void {
  if (!args.email) {
    console.error('Error: --email is required')
    process.exit(1)
  }
  
  if (!args.plan) {
    console.error('Error: --plan is required (lifetime, annual, trial)')
    process.exit(1)
  }
  
  if (!['lifetime', 'annual', 'trial'].includes(args.plan)) {
    console.error('Error: --plan must be one of: lifetime, annual, trial')
    process.exit(1)
  }
  
  if (!args.email.includes('@')) {
    console.error('Error: Invalid email address')
    process.exit(1)
  }
}

// Main function
async function main() {
  console.log('=== VaultCRM License Generator ===\n')
  
  const args = parseArgs()
  
  // Show help if no arguments
  if (Object.keys(args).length === 0 || args.help) {
    console.log('Usage:')
    console.log('  npx tsx scripts/generate-license.ts --email=user@example.com --plan=lifetime')
    console.log('')
    console.log('Options:')
    console.log('  --email       Required. Customer email address')
    console.log('  --plan        Required. License plan: lifetime, annual, trial')
    console.log('  --expires     Optional. Expiration date (YYYY-MM-DD)')
    console.log('  --machine     Optional. Machine ID for device-locked licenses')
    console.log('  --features    Optional. Comma-separated feature list (default: all)')
    console.log('  --output      Optional. Output file path')
    console.log('')
    console.log('Examples:')
    console.log('  npx tsx scripts/generate-license.ts --email=john@example.com --plan=lifetime')
    console.log('  npx tsx scripts/generate-license.ts --email=jane@example.com --plan=annual')
    console.log('  npx tsx scripts/generate-license.ts --email=test@example.com --plan=trial')
    process.exit(0)
  }
  
  validateArgs(args)
  
  // Ensure key pair exists
  const { privateKey, publicKey } = ensureKeyPair()
  
  // Determine expiration
  let expiresAt: string | null = null
  
  switch (args.plan) {
    case 'lifetime':
      expiresAt = null
      break
    case 'annual':
      expiresAt = args.expires || getAnnualExpiration()
      break
    case 'trial':
      expiresAt = args.expires || getTrialExpiration()
      break
  }
  
  // Build license payload
  const payload: Omit<LicensePayload, 'signature'> = {
    email: args.email,
    plan: args.plan as 'lifetime' | 'annual' | 'trial',
    issued_at: new Date().toISOString(),
    expires_at: expiresAt,
    features: args.features ? args.features.split(',') : ['all']
  }
  
  if (args.machine) {
    payload.machine_id = args.machine
  }
  
  // Sign the license
  const signature = signLicense(payload, privateKey)
  
  const signedPayload: LicensePayload = {
    ...payload,
    signature
  }
  
  // Encode as base64
  const licenseKey = Buffer.from(JSON.stringify(signedPayload)).toString('base64')
  
  // Output
  console.log('License Details:')
  console.log('----------------')
  console.log(`Email:    ${payload.email}`)
  console.log(`Plan:     ${payload.plan}`)
  console.log(`Issued:   ${payload.issued_at}`)
  console.log(`Expires:  ${payload.expires_at || 'Never (Lifetime)'}`)
  console.log(`Features: ${payload.features.join(', ')}`)
  if (payload.machine_id) {
    console.log(`Machine:  ${payload.machine_id}`)
  }
  console.log('')
  
  if (args.output) {
    writeFileSync(args.output, licenseKey, 'utf-8')
    console.log(`License key saved to: ${args.output}`)
  } else {
    console.log('License Key:')
    console.log('------------')
    console.log(licenseKey)
  }
  
  console.log('')
  console.log('Instructions for customer:')
  console.log('1. Open VaultCRM')
  console.log('2. Go to Settings > License')
  console.log('3. Click "Activate License"')
  console.log('4. Paste the license key above')
  console.log('')
  
  // Also output the license.json format for easy testing
  if (args.output) {
    const jsonPath = args.output.replace('.txt', '.json')
    writeFileSync(jsonPath, JSON.stringify(signedPayload, null, 2), 'utf-8')
    console.log(`License JSON saved to: ${jsonPath}`)
  }
}

main().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
