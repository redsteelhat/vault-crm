import { net, BrowserWindow } from 'electron'
import * as contactsRepo from '../database/repositories/contacts'

interface EnrichmentResult {
  favicon?: string
  logo?: string
  companyName?: string
  domain?: string
}

// Cache for domain assets (24 hour TTL)
interface CacheEntry {
  assets: { favicon?: string; logo?: string }
  timestamp: number
}

const domainCache = new Map<string, CacheEntry>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

function getCachedAssets(domain: string): { favicon?: string; logo?: string } | null {
  const entry = domainCache.get(domain)
  if (!entry) return null
  
  const now = Date.now()
  if (now - entry.timestamp > CACHE_TTL) {
    domainCache.delete(domain)
    return null
  }
  
  return entry.assets
}

function setCachedAssets(domain: string, assets: { favicon?: string; logo?: string }): void {
  domainCache.set(domain, {
    assets,
    timestamp: Date.now()
  })
}

/**
 * Extract domain from email address
 */
export function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)
  return match ? match[1] : null
}

/**
 * Get favicon URL for a domain
 * Uses Google's favicon service (free, no API key needed)
 */
export function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

/**
 * Get company logo URL using Clearbit's free logo API
 */
export function getLogoUrl(domain: string): string {
  return `https://logo.clearbit.com/${domain}`
}

/**
 * Fetch favicon/logo for a domain
 */
export async function fetchDomainAssets(domain: string): Promise<{ favicon?: string; logo?: string }> {
  // Check cache first
  const cached = getCachedAssets(domain)
  if (cached) {
    return cached
  }

  const result: { favicon?: string; logo?: string } = {}

  // Always return favicon URL (Google's service is reliable)
  result.favicon = getFaviconUrl(domain)

  // Try to check if Clearbit logo exists
  try {
    const logoUrl = getLogoUrl(domain)
    const response = await fetchWithTimeout(logoUrl, 3000)
    if (response.ok) {
      result.logo = logoUrl
    }
  } catch {
    // Logo not available, that's fine
  }

  // Cache the result
  setCachedAssets(domain, result)

  return result
}

/**
 * Fetch with timeout helper
 */
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = net.request(url)
    
    const timer = setTimeout(() => {
      request.abort()
      reject(new Error('Request timeout'))
    }, timeout)

    request.on('response', (response) => {
      clearTimeout(timer)
      resolve({
        ok: response.statusCode >= 200 && response.statusCode < 300,
        status: response.statusCode,
        statusText: response.statusMessage || ''
      } as Response)
    })

    request.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })

    request.end()
  })
}

/**
 * Enrich a contact with domain-based data
 */
export async function enrichContact(contactId: string): Promise<EnrichmentResult> {
  const contact = contactsRepo.getContactById(contactId)
  if (!contact) {
    throw new Error('Contact not found')
  }

  const result: EnrichmentResult = {}

  // Try to extract domain from email
  let domain: string | null = null
  try {
    const emails = JSON.parse(contact.emails || '[]')
    if (emails.length > 0) {
      domain = extractDomainFromEmail(emails[0])
    }
  } catch {
    // Invalid JSON, ignore
  }

  // Skip common email providers
  const skipDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com']
  if (domain && !skipDomains.includes(domain.toLowerCase())) {
    result.domain = domain
    const assets = await fetchDomainAssets(domain)
    result.favicon = assets.favicon
    result.logo = assets.logo
  }

  return result
}

/**
 * Batch enrich multiple contacts
 */
export async function batchEnrichContacts(contactIds: string[]): Promise<Map<string, EnrichmentResult>> {
  const results = new Map<string, EnrichmentResult>()

  for (const contactId of contactIds) {
    try {
      const result = await enrichContact(contactId)
      results.set(contactId, result)
    } catch (error) {
      console.error(`Error enriching contact ${contactId}:`, error)
      results.set(contactId, {})
    }
  }

  return results
}

// Batch queue state
interface BatchJob {
  id: string
  contactIds: string[]
  processed: number
  results: Map<string, EnrichmentResult>
  errors: string[]
  status: 'running' | 'paused' | 'cancelled' | 'completed'
  concurrency: number
}

let currentBatchJob: BatchJob | null = null

/**
 * Start batch enrichment with queue and progress events
 */
export async function startBatchEnrichment(
  contactIds: string[],
  options: { concurrency?: number } = {}
): Promise<{ jobId: string }> {
  if (currentBatchJob && currentBatchJob.status === 'running') {
    throw new Error('A batch enrichment job is already running')
  }

  const jobId = `batch_${Date.now()}`
  const concurrency = options.concurrency || 3

  currentBatchJob = {
    id: jobId,
    contactIds: [...contactIds],
    processed: 0,
    results: new Map(),
    errors: [],
    status: 'running',
    concurrency
  }

  // Start processing in background
  processBatchQueue(jobId).catch((error) => {
    console.error('Batch enrichment error:', error)
    if (currentBatchJob?.id === jobId) {
      currentBatchJob.status = 'cancelled'
      const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      win.webContents.send('enrichment:batchError', { error: error.message })
    })
    }
  })

  return { jobId }
}

async function processBatchQueue(jobId: string) {
  if (!currentBatchJob || currentBatchJob.id !== jobId) return

  const { contactIds, concurrency } = currentBatchJob
  const total = contactIds.length

  // Process in batches with concurrency
  for (let i = 0; i < contactIds.length; i += concurrency) {
    // Check if job was cancelled or paused
    if (!currentBatchJob || currentBatchJob.id !== jobId) return
    if (currentBatchJob.status === 'cancelled') return
    if (currentBatchJob.status === 'paused') {
      // Wait for resume
      await waitForResume(jobId)
      if (!currentBatchJob || currentBatchJob.id !== jobId) return
    }

    const batch = contactIds.slice(i, i + concurrency)
    const promises = batch.map(async (contactId) => {
      try {
        const result = await enrichContact(contactId)
        if (currentBatchJob && currentBatchJob.id === jobId) {
          currentBatchJob.results.set(contactId, result)
          currentBatchJob.processed++
          
          // Get contact name for progress
          const contact = contactsRepo.getContactById(contactId)
          const contactName = contact?.name || contactId

          // Emit progress event
          const windows = BrowserWindow.getAllWindows()
          windows.forEach(win => {
            win.webContents.send('enrichment:batchProgress', {
              processed: currentBatchJob.processed,
              total,
              current: contactName
            })
          })
        }
      } catch (error) {
        if (currentBatchJob && currentBatchJob.id === jobId) {
          currentBatchJob.errors.push(contactId)
          currentBatchJob.processed++
          const contact = contactsRepo.getContactById(contactId)
          const contactName = contact?.name || contactId
          const windows = BrowserWindow.getAllWindows()
          windows.forEach(win => {
            win.webContents.send('enrichment:batchProgress', {
              processed: currentBatchJob.processed,
              total,
              current: contactName
            })
          })
        }
      }
    })

    await Promise.all(promises)
  }

  // Job completed
  if (currentBatchJob && currentBatchJob.id === jobId) {
    currentBatchJob.status = 'completed'
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      win.webContents.send('enrichment:batchDone', {
        results: Object.fromEntries(currentBatchJob.results),
        errors: currentBatchJob.errors
      })
    })
    currentBatchJob = null
  }
}

async function waitForResume(jobId: string): Promise<void> {
  return new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      if (!currentBatchJob || currentBatchJob.id !== jobId) {
        clearInterval(checkInterval)
        resolve()
        return
      }
      if (currentBatchJob.status === 'running') {
        clearInterval(checkInterval)
        resolve()
        return
      }
      if (currentBatchJob.status === 'cancelled') {
        clearInterval(checkInterval)
        resolve()
        return
      }
    }, 100)
  })
}

export function pauseBatchEnrichment(): { success: boolean } {
  if (!currentBatchJob || currentBatchJob.status !== 'running') {
    return { success: false }
  }
  currentBatchJob.status = 'paused'
  return { success: true }
}

export function resumeBatchEnrichment(): { success: boolean } {
  if (!currentBatchJob || currentBatchJob.status !== 'paused') {
    return { success: false }
  }
  currentBatchJob.status = 'running'
  // Resume processing
  processBatchQueue(currentBatchJob.id).catch((error) => {
    console.error('Batch enrichment resume error:', error)
  })
  return { success: true }
}

export function cancelBatchEnrichment(): { success: boolean } {
  if (!currentBatchJob) {
    return { success: false }
  }
  currentBatchJob.status = 'cancelled'
  currentBatchJob = null
  return { success: true }
}

/**
 * Guess company name from email domain
 */
export function guessCompanyFromDomain(domain: string): string {
  // Remove TLD and common subdomains
  const parts = domain.split('.')
  if (parts.length >= 2) {
    let name = parts[parts.length - 2]
    // Skip common subdomains
    if (name === 'www' || name === 'mail' && parts.length > 2) {
      name = parts[parts.length - 3]
    }
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1)
  }
  return domain
}

/**
 * Extract company and title from LinkedIn profile data
 */
export function extractFromLinkedIn(profileText: string): { company?: string; title?: string } {
  const result: { company?: string; title?: string } = {}

  // Look for common patterns
  const titleMatch = profileText.match(/(?:^|\n)([^|]+?)\s+at\s+([^\n]+)/i)
  if (titleMatch) {
    result.title = titleMatch[1].trim()
    result.company = titleMatch[2].trim()
  }

  // Alternative pattern: "Title | Company"
  const pipeMatch = profileText.match(/(?:^|\n)([^|\n]+?)\s*\|\s*([^\n]+)/i)
  if (pipeMatch && !result.title) {
    result.title = pipeMatch[1].trim()
    result.company = pipeMatch[2].trim()
  }

  return result
}

/**
 * Detect title changes from LinkedIn activity
 */
export function detectTitleChange(oldTitle: string | null, newTitle: string): boolean {
  if (!oldTitle) return false
  return oldTitle.toLowerCase() !== newTitle.toLowerCase()
}

/**
 * Get enrichment suggestions for a contact
 */
export function getEnrichmentSuggestions(contact: { emails: string; company: string | null }): string[] {
  const suggestions: string[] = []

  try {
    const emails = JSON.parse(contact.emails || '[]')
    if (emails.length > 0) {
      const domain = extractDomainFromEmail(emails[0])
      if (domain && !contact.company) {
        const skipDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com']
        if (!skipDomains.includes(domain.toLowerCase())) {
          suggestions.push(`Company might be: ${guessCompanyFromDomain(domain)}`)
        }
      }
    }
  } catch {
    // Invalid JSON, ignore
  }

  return suggestions
}
