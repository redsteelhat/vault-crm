import { net } from 'electron'
import * as contactsRepo from '../database/repositories/contacts'

interface EnrichmentResult {
  favicon?: string
  logo?: string
  companyName?: string
  domain?: string
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
