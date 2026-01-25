/**
 * LinkedIn Profile Text Parser
 * 
 * Extracts contact information from copied LinkedIn profile text.
 * Works with various LinkedIn profile text formats.
 */

export interface LinkedInData {
  name: string | null
  title: string | null
  company: string | null
  location: string | null
  headline: string | null
  about: string | null
  email: string | null
  website: string | null
  confidence: number // 0-100 confidence score
}

/**
 * Parse LinkedIn profile text and extract contact information
 */
export function parseLinkedInText(text: string): LinkedInData {
  const result: LinkedInData = {
    name: null,
    title: null,
    company: null,
    location: null,
    headline: null,
    about: null,
    email: null,
    website: null,
    confidence: 0
  }

  if (!text || text.trim().length === 0) {
    return result
  }

  // Clean the text
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  let confidenceScore = 0

  // Try to detect LinkedIn profile patterns
  const isLinkedInProfile = 
    text.includes('LinkedIn') ||
    text.includes('connections') ||
    text.includes('followers') ||
    text.includes('Experience') ||
    text.includes('Education') ||
    /\d+\s*(connections|followers)/i.test(text)

  if (isLinkedInProfile) {
    confidenceScore += 20
  }

  // Extract name (usually first non-empty line, before any separator)
  const nameResult = extractName(lines)
  if (nameResult) {
    result.name = nameResult
    confidenceScore += 20
  }

  // Extract headline (usually after name, contains title/company pattern)
  const headlineResult = extractHeadline(lines, result.name)
  if (headlineResult) {
    result.headline = headlineResult
    confidenceScore += 15
    
    // Parse title and company from headline
    const { title, company } = parseHeadline(headlineResult)
    if (title) {
      result.title = title
      confidenceScore += 10
    }
    if (company) {
      result.company = company
      confidenceScore += 10
    }
  }

  // Extract location
  const locationResult = extractLocation(lines)
  if (locationResult) {
    result.location = locationResult
    confidenceScore += 10
  }

  // Extract About section
  const aboutResult = extractAbout(text)
  if (aboutResult) {
    result.about = aboutResult
    confidenceScore += 5
  }

  // Extract email
  const emailResult = extractEmail(text)
  if (emailResult) {
    result.email = emailResult
    confidenceScore += 10
  }

  // Extract website
  const websiteResult = extractWebsite(text)
  if (websiteResult) {
    result.website = websiteResult
    confidenceScore += 5
  }

  result.confidence = Math.min(confidenceScore, 100)
  return result
}

/**
 * Extract name from lines
 */
function extractName(lines: string[]): string | null {
  if (lines.length === 0) return null

  // Skip common LinkedIn header text
  const skipPatterns = [
    /^(Skip to|Sign in|Join now|LinkedIn)/i,
    /^(Search|Home|My Network|Jobs|Messaging|Notifications|Me)/i,
    /^\d+\s*(connections|followers)/i,
    /^(View|Edit|More|Open|Close)/i
  ]

  for (const line of lines.slice(0, 5)) {
    // Skip if matches skip patterns
    if (skipPatterns.some((pattern) => pattern.test(line))) {
      continue
    }

    // Name should be 2-5 words, no special characters except hyphen/apostrophe
    const namePattern = /^[A-ZÀ-ÿ][a-zà-ÿ'-]+(\s+[A-ZÀ-ÿ][a-zà-ÿ'-]+){0,4}$/
    if (namePattern.test(line) && line.length < 50) {
      // Verify it's not a job title
      const titleKeywords = [
        'Engineer', 'Manager', 'Director', 'CEO', 'CTO', 'CFO',
        'Developer', 'Designer', 'Analyst', 'Consultant', 'Lead',
        'Senior', 'Junior', 'VP', 'President', 'Founder'
      ]
      
      if (!titleKeywords.some((kw) => line.includes(kw))) {
        return line
      }
    }
  }

  // Fallback: just use first reasonable line
  for (const line of lines.slice(0, 3)) {
    if (line.length > 2 && line.length < 40 && !line.includes('@')) {
      return line
    }
  }

  return null
}

/**
 * Extract headline from lines
 */
function extractHeadline(lines: string[], name: string | null): string | null {
  const nameIndex = name ? lines.findIndex((l) => l === name) : -1
  const startIndex = nameIndex >= 0 ? nameIndex + 1 : 0

  // Headline patterns
  const headlinePatterns = [
    / at /i,           // "Engineer at Google"
    / @ /,             // "Developer @ Startup"
    / - /,             // "CEO - Acme Corp"
    / \| /,            // "Designer | Freelance"
    /^(Senior|Lead|Staff|Principal|Chief|Head of)/i,
    /(Engineer|Developer|Designer|Manager|Director|Founder|CEO|CTO|VP)/i
  ]

  for (const line of lines.slice(startIndex, startIndex + 5)) {
    // Skip location-like lines
    if (/^[A-Z][a-z]+,\s*[A-Z]/.test(line)) continue
    if (/\d+\s*(connections|followers)/i.test(line)) continue

    // Check if line looks like a headline
    if (headlinePatterns.some((pattern) => pattern.test(line))) {
      return line
    }
  }

  // Fallback: line after name that's longer than 10 chars
  if (startIndex < lines.length && lines[startIndex].length > 10) {
    return lines[startIndex]
  }

  return null
}

/**
 * Parse headline into title and company
 */
function parseHeadline(headline: string): { title: string | null; company: string | null } {
  let title: string | null = null
  let company: string | null = null

  // Pattern: "Title at Company"
  const atMatch = headline.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i)
  if (atMatch) {
    title = atMatch[1].trim()
    company = atMatch[2].trim()
    return { title, company }
  }

  // Pattern: "Title - Company"
  const dashMatch = headline.match(/^(.+?)\s*[-–—]\s*(.+)$/)
  if (dashMatch) {
    // Figure out which is title and which is company
    const part1 = dashMatch[1].trim()
    const part2 = dashMatch[2].trim()
    
    // If part1 contains title keywords, it's the title
    const titleKeywords = ['Engineer', 'Developer', 'Designer', 'Manager', 'Director', 'Lead', 'Senior', 'VP', 'CEO', 'CTO', 'Founder']
    if (titleKeywords.some((kw) => part1.includes(kw))) {
      title = part1
      company = part2
    } else {
      title = part1
      company = part2
    }
    return { title, company }
  }

  // Pattern: "Title | Company"
  const pipeMatch = headline.match(/^(.+?)\s*\|\s*(.+)$/)
  if (pipeMatch) {
    title = pipeMatch[1].trim()
    company = pipeMatch[2].trim()
    return { title, company }
  }

  // No pattern matched, use whole headline as title
  title = headline
  return { title, company }
}

/**
 * Extract location from lines
 */
function extractLocation(lines: string[]): string | null {
  // Location patterns
  const locationPatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z]{2}|[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/,  // "San Francisco, CA"
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*([A-Z][a-z]+)$/,  // "London, England"
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/  // "Istanbul"
  ]

  // Common location keywords
  const locationKeywords = ['Area', 'Region', 'Metro', 'Greater', 'Bay Area']

  for (const line of lines) {
    // Check patterns
    for (const pattern of locationPatterns) {
      if (pattern.test(line)) {
        return line
      }
    }

    // Check keywords
    if (locationKeywords.some((kw) => line.includes(kw))) {
      return line
    }
  }

  return null
}

/**
 * Extract About section from text
 */
function extractAbout(text: string): string | null {
  // Look for About section
  const aboutMatch = text.match(/(?:About|Summary|Bio)\s*\n\s*(.+?)(?:\n\n|Experience|Education|Skills)/is)
  if (aboutMatch) {
    return aboutMatch[1].trim().substring(0, 500)
  }

  return null
}

/**
 * Extract email from text
 */
function extractEmail(text: string): string | null {
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  const matches = text.match(emailPattern)
  
  if (matches && matches.length > 0) {
    // Filter out common non-personal emails
    const personalEmail = matches.find((email) => {
      const lowered = email.toLowerCase()
      return !lowered.includes('linkedin') && 
             !lowered.includes('noreply') && 
             !lowered.includes('support')
    })
    return personalEmail || matches[0]
  }

  return null
}

/**
 * Extract website from text
 */
function extractWebsite(text: string): string | null {
  // Website patterns
  const urlPattern = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:\/[^\s]*)?/g
  const matches = text.match(urlPattern)

  if (matches && matches.length > 0) {
    // Filter out LinkedIn URLs
    const personalUrl = matches.find((url) => {
      const lowered = url.toLowerCase()
      return !lowered.includes('linkedin')
    })
    return personalUrl || null
  }

  return null
}

/**
 * Validate parsed data quality
 */
export function validateLinkedInData(data: LinkedInData): {
  isValid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!data.name) {
    issues.push('Name could not be detected')
  }

  if (!data.title && !data.headline) {
    issues.push('Title/headline could not be detected')
  }

  if (data.confidence < 30) {
    issues.push('Low confidence - text may not be from LinkedIn')
  }

  return {
    isValid: issues.length === 0,
    issues
  }
}
