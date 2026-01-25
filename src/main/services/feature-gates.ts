/**
 * Feature Gates Service
 * 
 * Manages feature availability based on license tier (Free vs Pro)
 */

import { getLicenseStatus, type LicenseInfo } from './license'
import { getContactCount } from '../database/repositories/contacts'
import { getSetting, setSetting } from '../database/repositories/settings'

// Feature gate configuration
export interface FeatureGates {
  maxContacts: number
  csvImportEnabled: boolean
  fullCsvImport: boolean // headers mapping, etc.
  smartListsEnabled: boolean
  allSmartLists: boolean // Only Stale 30 in free, all in pro
  duplicateMergeEnabled: boolean
  autoBackupEnabled: boolean
  fullBackupEnabled: boolean
  exportEnabled: boolean
  fullExportEnabled: boolean // CSV + encrypted backup in pro
}

export type LicenseTier = 'free' | 'pro'

// Free tier limits
const FREE_CONTACT_LIMIT = 50

// Feature gates by tier
const TIER_FEATURES: Record<LicenseTier, FeatureGates> = {
  free: {
    maxContacts: FREE_CONTACT_LIMIT,
    csvImportEnabled: true,
    fullCsvImport: false, // Limited column mapping
    smartListsEnabled: true,
    allSmartLists: false, // Only Stale 30
    duplicateMergeEnabled: false,
    autoBackupEnabled: false,
    fullBackupEnabled: false,
    exportEnabled: true,
    fullExportEnabled: false // CSV only
  },
  pro: {
    maxContacts: Infinity,
    csvImportEnabled: true,
    fullCsvImport: true,
    smartListsEnabled: true,
    allSmartLists: true,
    duplicateMergeEnabled: true,
    autoBackupEnabled: true,
    fullBackupEnabled: true,
    exportEnabled: true,
    fullExportEnabled: true
  }
}

/**
 * Get current license tier
 */
export function getCurrentTier(): LicenseTier {
  try {
    const licenseStatus = getLicenseStatus()
    
    if (licenseStatus.valid && licenseStatus.license) {
      // Check license type
      const licenseType = licenseStatus.license.type
      if (licenseType === 'lifetime' || licenseType === 'pro') {
        return 'pro'
      }
    }
    
    return 'free'
  } catch {
    return 'free'
  }
}

/**
 * Get feature gates for current tier
 */
export function getFeatureGates(): FeatureGates {
  const tier = getCurrentTier()
  return TIER_FEATURES[tier]
}

/**
 * Check if user can add more contacts
 */
export function canAddContact(): { allowed: boolean; reason?: string; remaining?: number } {
  const gates = getFeatureGates()
  
  if (gates.maxContacts === Infinity) {
    return { allowed: true }
  }
  
  try {
    const currentCount = getContactCount()
    const remaining = gates.maxContacts - currentCount
    
    if (currentCount >= gates.maxContacts) {
      return {
        allowed: false,
        reason: `Free tier limit reached (${gates.maxContacts} contacts)`,
        remaining: 0
      }
    }
    
    return { allowed: true, remaining }
  } catch {
    // If we can't check, allow (fail open for better UX)
    return { allowed: true }
  }
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureGates): boolean {
  const gates = getFeatureGates()
  const value = gates[feature]
  
  if (typeof value === 'boolean') {
    return value
  }
  
  // For numeric limits, just return true (use canAddContact for contacts)
  return true
}

/**
 * Get tier display info for UI
 */
export function getTierInfo(): {
  tier: LicenseTier
  displayName: string
  isLimited: boolean
  contactLimit: number
  contactsUsed: number
  contactsRemaining: number
  upgradeUrl: string
} {
  const tier = getCurrentTier()
  const gates = TIER_FEATURES[tier]
  
  let contactsUsed = 0
  try {
    contactsUsed = getContactCount()
  } catch {
    // Ignore
  }
  
  const contactLimit = gates.maxContacts === Infinity ? -1 : gates.maxContacts
  const contactsRemaining = contactLimit === -1 ? -1 : Math.max(0, contactLimit - contactsUsed)
  
  return {
    tier,
    displayName: tier === 'pro' ? 'Pro' : 'Free',
    isLimited: tier === 'free',
    contactLimit,
    contactsUsed,
    contactsRemaining,
    upgradeUrl: 'https://vaultcrm.app/upgrade'
  }
}

/**
 * Get upgrade prompt message
 */
export function getUpgradePrompt(feature: keyof FeatureGates): {
  title: string
  message: string
  cta: string
} {
  const prompts: Record<string, { title: string; message: string; cta: string }> = {
    maxContacts: {
      title: 'Contact Limit Reached',
      message: 'You have reached the free tier limit of 50 contacts. Upgrade to Pro for unlimited contacts.',
      cta: 'Upgrade to Pro'
    },
    duplicateMergeEnabled: {
      title: 'Pro Feature',
      message: 'Duplicate detection and merge is a Pro feature. Upgrade to automatically find and merge duplicate contacts.',
      cta: 'Upgrade to Pro'
    },
    autoBackupEnabled: {
      title: 'Pro Feature',
      message: 'Automatic backups are a Pro feature. Upgrade to enable daily/weekly automatic backups.',
      cta: 'Upgrade to Pro'
    },
    fullBackupEnabled: {
      title: 'Pro Feature',
      message: 'Encrypted full backups are a Pro feature. Upgrade to create complete encrypted backups.',
      cta: 'Upgrade to Pro'
    },
    allSmartLists: {
      title: 'Pro Feature',
      message: 'Additional smart lists (Stale 60, Stale 90, Hot List) are Pro features. Upgrade for full access.',
      cta: 'Upgrade to Pro'
    }
  }
  
  return prompts[feature] || {
    title: 'Pro Feature',
    message: 'This feature requires a Pro license. Upgrade to unlock all features.',
    cta: 'Upgrade to Pro'
  }
}

/**
 * Record that user was shown upgrade prompt (for analytics)
 */
export function recordUpgradePromptShown(feature: string): void {
  try {
    const key = `upgrade_prompt_${feature}_count`
    const current = parseInt(getSetting(key) || '0', 10)
    setSetting(key, String(current + 1))
    setSetting(`upgrade_prompt_${feature}_last`, new Date().toISOString())
  } catch {
    // Ignore
  }
}

/**
 * Get list of features available in each tier
 */
export function getTierComparison(): {
  feature: string
  description: string
  free: boolean | string
  pro: boolean | string
}[] {
  return [
    {
      feature: 'Contacts',
      description: 'Number of contacts you can store',
      free: '50',
      pro: 'Unlimited'
    },
    {
      feature: 'CSV Import',
      description: 'Import contacts from CSV files',
      free: true,
      pro: true
    },
    {
      feature: 'Smart Lists',
      description: 'Automatic contact segmentation',
      free: 'Stale 30 only',
      pro: 'All lists'
    },
    {
      feature: 'Duplicate Merge',
      description: 'Find and merge duplicate contacts',
      free: false,
      pro: true
    },
    {
      feature: 'Auto Backup',
      description: 'Automatic encrypted backups',
      free: false,
      pro: true
    },
    {
      feature: 'Full Export',
      description: 'Export as CSV or encrypted backup',
      free: 'CSV only',
      pro: 'CSV + Backup'
    },
    {
      feature: 'Encryption',
      description: 'AES-256-GCM encryption',
      free: true,
      pro: true
    },
    {
      feature: 'Offline Mode',
      description: 'Works without internet',
      free: true,
      pro: true
    }
  ]
}
