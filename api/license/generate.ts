/**
 * VaultCRM License Generation API
 * Vercel Serverless Function
 * 
 * POST /api/license/generate
 * Body: { email: string, plan: 'lifetime' | 'annual' | 'trial', expires?: string, machineId?: string }
 * 
 * Returns: { success: true, licenseKey: string } or { success: false, error: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { generateKeyPairSync, sign, createPrivateKey } from 'crypto'

interface LicensePayload {
  email: string
  plan: 'lifetime' | 'annual' | 'trial'
  issued_at: string
  expires_at: string | null
  machine_id?: string
  features: string[]
  signature?: string
}

// Private key should be stored in Vercel environment variables
// Format: -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
function getPrivateKey(): string {
  const key = process.env.LICENSE_PRIVATE_KEY
  if (!key) {
    throw new Error('LICENSE_PRIVATE_KEY environment variable not set')
  }
  return key
}

function signLicense(payload: Omit<LicensePayload, 'signature'>): string {
  const privateKey = createPrivateKey({
    key: getPrivateKey(),
    format: 'pem',
    type: 'pkcs8'
  })
  
  const message = JSON.stringify(payload)
  const signature = sign('RSA-SHA256', Buffer.from(message), privateKey)
  return signature.toString('base64')
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // CORS headers (if needed)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const { email, plan, expires, machineId } = req.body

    // Validation
    if (!email || !plan) {
      return res.status(400).json({ 
        success: false, 
        error: 'Email and plan are required' 
      })
    }

    if (!['lifetime', 'annual', 'trial'].includes(plan)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid plan. Must be: lifetime, annual, or trial' 
      })
    }

    // Calculate expiration
    let expiresAt: string | null = null
    if (plan === 'lifetime') {
      expiresAt = null
    } else if (expires) {
      expiresAt = new Date(expires).toISOString()
    } else {
      // Default: 1 year for annual, 30 days for trial
      const date = new Date()
      if (plan === 'annual') {
        date.setFullYear(date.getFullYear() + 1)
      } else if (plan === 'trial') {
        date.setDate(date.getDate() + 30)
      }
      expiresAt = date.toISOString()
    }

    // Create license payload
    const payload: Omit<LicensePayload, 'signature'> = {
      email,
      plan,
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      features: ['all'],
      ...(machineId && { machine_id: machineId })
    }

    // Sign the license
    const signature = signLicense(payload)

    const signedPayload: LicensePayload = {
      ...payload,
      signature
    }

    // Encode as base64
    const licenseKey = Buffer.from(JSON.stringify(signedPayload)).toString('base64')

    // TODO: Store license in database (optional)
    // await storeLicense(email, licenseKey, plan, expiresAt)

    return res.status(200).json({
      success: true,
      licenseKey,
      license: {
        email,
        plan,
        issuedAt: payload.issued_at,
        expiresAt: payload.expires_at
      }
    })
  } catch (error) {
    console.error('License generation error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
