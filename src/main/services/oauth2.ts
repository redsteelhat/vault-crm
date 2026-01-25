import { BrowserWindow, session } from 'electron'
import * as keytar from 'keytar'

const SERVICE_NAME = 'VaultCRM'

// OAuth2 Configuration
interface OAuth2Config {
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
  redirectUri: string
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
}

// Google OAuth2 Configuration
export const GOOGLE_CONFIG: OAuth2Config = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  redirectUri: 'http://localhost:8888/callback'
}

// Microsoft OAuth2 Configuration
export const MICROSOFT_CONFIG: OAuth2Config = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: [
    'openid',
    'profile',
    'email',
    'Mail.Read',
    'Calendars.Read',
    'offline_access'
  ],
  redirectUri: 'http://localhost:8888/callback'
}

/**
 * Store tokens securely in OS keychain
 */
export async function storeTokens(
  provider: 'gmail' | 'outlook',
  email: string,
  tokens: { accessToken: string; refreshToken?: string; expiresAt: number }
): Promise<void> {
  const key = `${provider}:${email}`
  await keytar.setPassword(SERVICE_NAME, key, JSON.stringify(tokens))
}

/**
 * Retrieve tokens from OS keychain
 */
export async function getTokens(
  provider: 'gmail' | 'outlook',
  email: string
): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number } | null> {
  const key = `${provider}:${email}`
  const data = await keytar.getPassword(SERVICE_NAME, key)
  if (!data) return null
  
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}

/**
 * Delete tokens from OS keychain
 */
export async function deleteTokens(provider: 'gmail' | 'outlook', email: string): Promise<void> {
  const key = `${provider}:${email}`
  await keytar.deletePassword(SERVICE_NAME, key)
}

/**
 * Check if tokens are expired or about to expire
 */
export function isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
  return Date.now() >= (expiresAt - bufferSeconds * 1000)
}

/**
 * Generate authorization URL
 */
export function getAuthUrl(config: OAuth2Config, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent'
  })

  return `${config.authUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  config: OAuth2Config,
  code: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token exchange failed: ${error}`)
  }

  return response.json()
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
  config: OAuth2Config,
  refreshToken: string
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  })

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Token refresh failed: ${error}`)
  }

  return response.json()
}

/**
 * Start OAuth2 authentication flow in a popup window
 */
export function startOAuth2Flow(
  config: OAuth2Config,
  onSuccess: (code: string) => void,
  onError: (error: Error) => void
): BrowserWindow {
  const state = Math.random().toString(36).substring(2)
  const authUrl = getAuthUrl(config, state)

  const authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // Clear any existing session cookies for clean auth
  session.defaultSession.clearStorageData({
    storages: ['cookies']
  })

  authWindow.loadURL(authUrl)

  // Handle redirect
  authWindow.webContents.on('will-redirect', (event, url) => {
    handleCallback(url, state, authWindow, onSuccess, onError)
  })

  authWindow.webContents.on('will-navigate', (event, url) => {
    handleCallback(url, state, authWindow, onSuccess, onError)
  })

  authWindow.on('closed', () => {
    // User closed window before completing auth
  })

  return authWindow
}

function handleCallback(
  url: string,
  expectedState: string,
  authWindow: BrowserWindow,
  onSuccess: (code: string) => void,
  onError: (error: Error) => void
): void {
  const urlObj = new URL(url)
  
  if (!urlObj.href.startsWith('http://localhost:8888/callback')) {
    return
  }

  const code = urlObj.searchParams.get('code')
  const state = urlObj.searchParams.get('state')
  const error = urlObj.searchParams.get('error')

  if (error) {
    authWindow.close()
    onError(new Error(urlObj.searchParams.get('error_description') || error))
    return
  }

  if (state !== expectedState) {
    authWindow.close()
    onError(new Error('Invalid state parameter'))
    return
  }

  if (code) {
    authWindow.close()
    onSuccess(code)
  }
}

/**
 * Get valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  provider: 'gmail' | 'outlook',
  email: string
): Promise<string | null> {
  const tokens = await getTokens(provider, email)
  if (!tokens) return null

  // Check if token is expired
  if (!isTokenExpired(tokens.expiresAt)) {
    return tokens.accessToken
  }

  // Try to refresh
  if (!tokens.refreshToken) {
    return null
  }

  try {
    const config = provider === 'gmail' ? GOOGLE_CONFIG : MICROSOFT_CONFIG
    const newTokens = await refreshAccessToken(config, tokens.refreshToken)

    // Store new tokens
    await storeTokens(provider, email, {
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || tokens.refreshToken,
      expiresAt: Date.now() + newTokens.expires_in * 1000
    })

    return newTokens.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

/**
 * Check if OAuth2 is configured for a provider
 */
export function isOAuth2Configured(provider: 'gmail' | 'outlook'): boolean {
  const config = provider === 'gmail' ? GOOGLE_CONFIG : MICROSOFT_CONFIG
  return Boolean(config.clientId && config.clientSecret)
}
