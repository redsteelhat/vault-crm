import { getValidAccessToken, storeTokens, deleteTokens, MICROSOFT_CONFIG, exchangeCodeForTokens, startOAuth2Flow, isOAuth2Configured } from './oauth2'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/sqlite/connection'
import type { EmailAccount, SyncedEmail, CalendarEvent } from '../database/types'

const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0'

interface OutlookMessage {
  id: string
  conversationId: string
  subject: string
  bodyPreview: string
  from: { emailAddress: { address: string; name?: string } }
  toRecipients: { emailAddress: { address: string; name?: string } }[]
  receivedDateTime: string
  isRead: boolean
  isDraft: boolean
  sentDateTime?: string
}

interface OutlookEvent {
  id: string
  subject: string
  bodyPreview?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  location?: { displayName: string }
  attendees?: { emailAddress: { address: string; name?: string } }[]
  isAllDay: boolean
}

/**
 * Check if Outlook sync is available
 */
export function isOutlookSyncAvailable(): boolean {
  return isOAuth2Configured('outlook')
}

/**
 * Start Outlook authentication
 */
export function startOutlookAuth(): Promise<{ email: string; accountId: string }> {
  return new Promise((resolve, reject) => {
    startOAuth2Flow(
      MICROSOFT_CONFIG,
      async (code) => {
        try {
          // Exchange code for tokens
          const tokens = await exchangeCodeForTokens(MICROSOFT_CONFIG, code)

          // Get user email
          const userInfo = await fetchUserInfo(tokens.access_token)

          // Store tokens
          await storeTokens('outlook', userInfo.email, {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: Date.now() + tokens.expires_in * 1000
          })

          // Create email account record
          const accountId = uuidv4()
          run(`
            INSERT INTO email_accounts (id, provider, email, sync_enabled, sync_emails, sync_calendar)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [accountId, 'outlook', userInfo.email, 1, 1, 1])

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
 * Fetch user info from Microsoft Graph
 */
async function fetchUserInfo(accessToken: string): Promise<{ email: string }> {
  const response = await fetch(`${GRAPH_API_BASE}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  const data = await response.json()
  return { email: data.mail || data.userPrincipalName }
}

/**
 * Sync emails for an account
 */
export async function syncEmails(accountId: string): Promise<{ synced: number; errors: number }> {
  const account = queryOne<EmailAccount>(
    'SELECT * FROM email_accounts WHERE id = ? AND provider = ?',
    [accountId, 'outlook']
  )

  if (!account || !account.sync_emails) {
    return { synced: 0, errors: 0 }
  }

  const accessToken = await getValidAccessToken('outlook', account.email)
  if (!accessToken) {
    throw new Error('No valid access token')
  }

  let synced = 0
  let errors = 0

  try {
    // Fetch recent emails (last 7 days or top 50)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    
    const response = await fetch(
      `${GRAPH_API_BASE}/me/messages?$top=50&$filter=receivedDateTime ge ${sevenDaysAgo}&$orderby=receivedDateTime desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch messages')
    }

    const data = await response.json()
    const messages: OutlookMessage[] = data.value || []

    for (const message of messages) {
      try {
        // Check if already synced
        const existing = queryOne<SyncedEmail>(
          'SELECT id FROM synced_emails WHERE account_id = ? AND message_id = ?',
          [accountId, message.id]
        )

        if (existing) continue

        const fromAddr = message.from?.emailAddress?.address || ''
        const toAddr = message.toRecipients?.map(r => r.emailAddress.address).join(', ') || ''
        const date = message.receivedDateTime
        const isSent = !!message.sentDateTime

        // Try to match with a contact
        const emailToMatch = isSent ? (message.toRecipients?.[0]?.emailAddress?.address || '') : fromAddr
        let contactId: string | null = null
        
        if (emailToMatch) {
          const contact = queryOne<{ id: string }>(
            `SELECT id FROM contacts WHERE emails LIKE ?`,
            [`%${emailToMatch}%`]
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
          message.id,
          message.conversationId,
          message.subject || '',
          message.bodyPreview || '',
          fromAddr,
          toAddr,
          date,
          message.isRead ? 1 : 0,
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
    [accountId, 'outlook']
  )

  if (!account || !account.sync_calendar) {
    return { synced: 0, errors: 0 }
  }

  const accessToken = await getValidAccessToken('outlook', account.email)
  if (!accessToken) {
    throw new Error('No valid access token')
  }

  let synced = 0
  let errors = 0

  try {
    // Fetch upcoming events (next 30 days)
    const now = new Date().toISOString()
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const response = await fetch(
      `${GRAPH_API_BASE}/me/calendarview?startDateTime=${now}&endDateTime=${future}&$top=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events')
    }

    const data = await response.json()
    const events: OutlookEvent[] = data.value || []

    for (const event of events) {
      try {
        // Check if already synced
        const existing = queryOne<CalendarEvent>(
          'SELECT id FROM calendar_events WHERE account_id = ? AND event_id = ?',
          [accountId, event.id]
        )

        if (existing) continue

        // Try to match with a contact based on attendees
        let contactId: string | null = null
        if (event.attendees) {
          for (const attendee of event.attendees) {
            const contact = queryOne<{ id: string }>(
              `SELECT id FROM contacts WHERE emails LIKE ?`,
              [`%${attendee.emailAddress.address}%`]
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
          event.subject || 'Untitled',
          event.bodyPreview || null,
          event.start.dateTime,
          event.end.dateTime,
          event.location?.displayName || null,
          JSON.stringify(event.attendees || []),
          event.isAllDay ? 1 : 0
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
 * Disconnect Outlook account
 */
export async function disconnectOutlookAccount(accountId: string): Promise<void> {
  const account = queryOne<EmailAccount>(
    'SELECT * FROM email_accounts WHERE id = ? AND provider = ?',
    [accountId, 'outlook']
  )

  if (!account) return

  // Delete tokens from keychain
  await deleteTokens('outlook', account.email)

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
