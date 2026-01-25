import { getValidAccessToken, storeTokens, deleteTokens, GOOGLE_CONFIG, exchangeCodeForTokens, startOAuth2Flow, isOAuth2Configured } from './oauth2'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/sqlite/connection'
import type { EmailAccount, SyncedEmail, CalendarEvent } from '../database/types'

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1'
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3'

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
  }
  internalDate: string
}

interface CalendarEventData {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  attendees?: { email: string; displayName?: string }[]
}

/**
 * Check if Gmail sync is available
 */
export function isGmailSyncAvailable(): boolean {
  return isOAuth2Configured('gmail')
}

/**
 * Start Gmail authentication
 */
export function startGmailAuth(): Promise<{ email: string; accountId: string }> {
  return new Promise((resolve, reject) => {
    startOAuth2Flow(
      GOOGLE_CONFIG,
      async (code) => {
        try {
          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(GOOGLE_CONFIG, code)

          // Get user email
          const userInfo = await fetchUserInfo(tokens.access_token)

          // Store tokens
          await storeTokens('gmail', userInfo.email, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000
          })

          // Create email account record
          const accountId = uuidv4()
          run(`
            INSERT INTO email_accounts (id, provider, email, sync_enabled, sync_emails, sync_calendar)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [accountId, 'gmail', userInfo.email, 1, 1, 1])

          resolve({ email: userInfo.email, accountId })
        } catch (error) {
          reject(error)
        }
      },
      reject
    )
  })
}

/**
 * Fetch user info from Google
 */
async function fetchUserInfo(accessToken: string): Promise<{ email: string }> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  return response.json()
}

/**
 * Sync emails for an account
 */
export async function syncEmails(accountId: string): Promise<{ synced: number; errors: number }> {
  const account = queryOne<EmailAccount>(
    'SELECT * FROM email_accounts WHERE id = ? AND provider = ?',
    [accountId, 'gmail']
  )

  if (!account || !account.sync_emails) {
    return { synced: 0, errors: 0 }
  }

  const accessToken = await getValidAccessToken('gmail', account.email)
  if (!accessToken) {
    throw new Error('No valid access token')
  }

  let synced = 0
  let errors = 0

  try {
    // Fetch recent emails (last 7 days or last 50)
    const response = await fetch(
      `${GMAIL_API_BASE}/users/me/messages?maxResults=50&q=newer_than:7d`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    const data = await response.json()
    const messages = data.messages || []

    for (const msg of messages) {
      try {
        // Check if already synced
        const existing = queryOne<SyncedEmail>(
          'SELECT id FROM synced_emails WHERE account_id = ? AND message_id = ?',
          [accountId, msg.id]
        )

        if (existing) continue

        // Fetch full message
        const msgResponse = await fetch(
          `${GMAIL_API_BASE}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (!msgResponse.ok) continue

        const message: GmailMessage = await msgResponse.json()

        // Extract headers
        const headers = message.payload.headers
        const getHeader = (name: string) => 
          headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || ''

        const fromAddr = getHeader('From')
        const toAddr = getHeader('To')
        const subject = getHeader('Subject')
        const date = new Date(parseInt(message.internalDate)).toISOString()
        const isRead = !message.labelIds.includes('UNREAD')
        const isSent = message.labelIds.includes('SENT')

        // Try to match with a contact
        const emailToMatch = isSent ? toAddr : fromAddr
        const emailMatch = emailToMatch.match(/<([^>]+)>/) || [null, emailToMatch]
        const contactEmail = emailMatch[1]

        let contactId: string | null = null
        if (contactEmail) {
          const contact = queryOne<{ id: string }>(
            `SELECT id FROM contacts WHERE emails LIKE ?`,
            [`%${contactEmail}%`]
          )
          contactId = contact?.id || null
        }

        // Store email
        const emailId = uuidv4()
        run(`
          INSERT INTO synced_emails (id, account_id, contact_id, message_id, thread_id, subject, snippet, from_addr, to_addr, date, is_read, is_sent)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          emailId,
          accountId,
          contactId,
          msg.id,
          message.threadId,
          subject,
          message.snippet,
          fromAddr,
          toAddr,
          date,
          isRead ? 1 : 0,
          isSent ? 1 : 0
        ])

        synced++
      } catch (error) {
        console.error('Error syncing message:', error)
        errors++
      }
    }

    // Update last sync time
    run(
      'UPDATE email_accounts SET last_email_sync_at = ? WHERE id = ?',
      [new Date().toISOString(), accountId]
    )
  } catch (error) {
    console.error('Error syncing emails:', error)
    throw error
  }

  return { synced, errors }
}

/**
 * Sync calendar events for an account
 */
export async function syncCalendar(accountId: string): Promise<{ synced: number; errors: number }> {
  const account = queryOne<EmailAccount>(
    'SELECT * FROM email_accounts WHERE id = ? AND provider = ?',
    [accountId, 'gmail']
  )

  if (!account || !account.sync_calendar) {
    return { synced: 0, errors: 0 }
  }

  const accessToken = await getValidAccessToken('gmail', account.email)
  if (!accessToken) {
    throw new Error('No valid access token')
  }

  let synced = 0
  let errors = 0

  try {
    // Fetch upcoming events (next 30 days)
    const now = new Date()
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const response = await fetch(
      `${CALENDAR_API_BASE}/calendars/primary/events?` + new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: '100',
        singleEvents: 'true',
        orderBy: 'startTime'
      }),
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events')
    }

    const data = await response.json()
    const events: CalendarEventData[] = data.items || []

    for (const event of events) {
      try {
        // Check if already synced
        const existing = queryOne<CalendarEvent>(
          'SELECT id FROM calendar_events WHERE account_id = ? AND event_id = ?',
          [accountId, event.id]
        )

        if (existing) continue

        const startAt = event.start.dateTime || event.start.date
        const endAt = event.end.dateTime || event.end.date
        const isAllDay = !event.start.dateTime

        // Try to match with a contact based on attendees
        let contactId: string | null = null
        if (event.attendees) {
          for (const attendee of event.attendees) {
            const contact = queryOne<{ id: string }>(
              `SELECT id FROM contacts WHERE emails LIKE ?`,
              [`%${attendee.email}%`]
            )
            if (contact) {
              contactId = contact.id
              break
            }
          }
        }

        // Store event
        const eventId = uuidv4()
        run(`
          INSERT INTO calendar_events (id, account_id, contact_id, event_id, title, description, start_at, end_at, location, attendees, is_all_day)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          eventId,
          accountId,
          contactId,
          event.id,
          event.summary || 'Untitled',
          event.description || null,
          startAt,
          endAt,
          event.location || null,
          JSON.stringify(event.attendees || []),
          isAllDay ? 1 : 0
        ])

        synced++
      } catch (error) {
        console.error('Error syncing event:', error)
        errors++
      }
    }

    // Update last sync time
    run(
      'UPDATE email_accounts SET last_calendar_sync_at = ? WHERE id = ?',
      [new Date().toISOString(), accountId]
    )
  } catch (error) {
    console.error('Error syncing calendar:', error)
    throw error
  }

  return { synced, errors }
}

/**
 * Disconnect Gmail account
 */
export async function disconnectGmailAccount(accountId: string): Promise<void> {
  const account = queryOne<EmailAccount>(
    'SELECT * FROM email_accounts WHERE id = ? AND provider = ?',
    [accountId, 'gmail']
  )

  if (!account) return

  // Delete tokens from keychain
  await deleteTokens('gmail', account.email)

  // Delete synced data
  run('DELETE FROM synced_emails WHERE account_id = ?', [accountId])
  run('DELETE FROM calendar_events WHERE account_id = ?', [accountId])
  run('DELETE FROM email_accounts WHERE id = ?', [accountId])
}

/**
 * Get synced emails for a contact
 */
export function getContactEmails(contactId: string): SyncedEmail[] {
  return query<SyncedEmail>(
    'SELECT * FROM synced_emails WHERE contact_id = ? ORDER BY date DESC',
    [contactId]
  )
}

/**
 * Get synced calendar events for a contact
 */
export function getContactEvents(contactId: string): CalendarEvent[] {
  return query<CalendarEvent>(
    'SELECT * FROM calendar_events WHERE contact_id = ? ORDER BY start_at ASC',
    [contactId]
  )
}
