/**
 * VaultCRM License Status API
 * Vercel Serverless Function
 * 
 * GET /api/license/status?key=LICENSE_KEY
 * 
 * Returns: { success: true, license: LicenseInfo } or { success: false, error: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createVerify, createPublicKey } from 'crypto'

interface LicensePayload {
  email: string
  plan: string
  issued_at: string
  expires_at: string | null
  machine_id?: string
  features: string[]
  signature: string
}

interface LicenseInfo {
  email: string
  plan: string
  issuedAt: string
  expiresAt: string | null
  isValid: boolean
  isExpired: boolean
}

function getPublicKey(): string {
  const key = process.env.LICENSE_PUBLIC_KEY
  if (!key) {
    throw new Error('LICENSE_PUBLIC_KEY environment variable not set')
  }
  return key
}

function verifyLicenseSignature(payload: LicensePayload): boolean {
  try {
    const { signature, ...data } = payload
    const message = JSON.stringify(data)
    
    const publicKey = createPublicKey({
      key: getPublicKey(),
      format: 'pem',
      type: 'spki'
    })
    
    const verify = createVerify('RSA-SHA256')
    verify.update(message)
    verify.end()
    
    return verify.verify(publicKey, signature, 'base64')
  } catch {
    return false
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const licenseKey = req.query.key as string

    if (!licenseKey) {
      return res.status(400).json({
        success: false,
        error: 'License key is required'
      })
    }

    // Decode base64 license key
    let payload: LicensePayload
    try {
      const decoded = Buffer.from(licenseKey, 'base64').toString('utf-8')
      payload = JSON.parse(decoded)
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid license key format'
      })
    }

    // Verify signature
    const isValidSignature = verifyLicenseSignature(payload)
    if (!isValidSignature) {
      return res.status(200).json({
        success: true,
        valid: false,
        error: 'Invalid license signature'
      })
    }

    // Check expiration
    const now = new Date()
    const expiresAt = payload.expires_at ? new Date(payload.expires_at) : null
    const isExpired = expiresAt ? expiresAt < now : false

    const licenseInfo: LicenseInfo = {
      email: payload.email,
      plan: payload.plan,
      issuedAt: payload.issued_at,
      expiresAt: payload.expires_at,
      isValid: !isExpired,
      isExpired
    }

    return res.status(200).json({
      success: true,
      license: licenseInfo
    })
  } catch (error) {
    console.error('License status error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
}
