import { net } from 'electron'
import * as settingsRepo from '../database/repositories/settings'
import * as keychainService from './keychain'

// AI Provider types
export type AIProvider = 'local' | 'openai' | 'anthropic'

export interface AIConfig {
  provider: AIProvider
  localEndpoint?: string // For Ollama: http://localhost:11434
  openaiApiKey?: string
  anthropicApiKey?: string
  model?: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  content: string
  tokensUsed?: number
}

/**
 * Get AI configuration from settings
 */
export async function getAIConfig(): Promise<AIConfig> {
  const provider = settingsRepo.getSetting('ai_provider') as AIProvider || 'local'
  
  // Get API keys from keychain
  let openaiApiKey = ''
  let anthropicApiKey = ''
  
  try {
    openaiApiKey = await keychainService.getKey('vaultcrm_ai_openai_key') || ''
  } catch {
    // Key not found, that's fine
  }
  
  try {
    anthropicApiKey = await keychainService.getKey('vaultcrm_ai_anthropic_key') || ''
  } catch {
    // Key not found, that's fine
  }
  
  return {
    provider,
    localEndpoint: settingsRepo.getSetting('ai_local_endpoint') || 'http://localhost:11434',
    openaiApiKey,
    anthropicApiKey,
    model: settingsRepo.getSetting('ai_model') || 'llama3.2'
  }
}

/**
 * Save AI configuration
 */
export async function setAIConfig(config: Partial<AIConfig>): Promise<void> {
  if (config.provider) settingsRepo.setSetting('ai_provider', config.provider)
  if (config.localEndpoint) settingsRepo.setSetting('ai_local_endpoint', config.localEndpoint)
  if (config.model) settingsRepo.setSetting('ai_model', config.model)
  
  // Save API keys to keychain
  if (config.openaiApiKey !== undefined) {
    if (config.openaiApiKey) {
      await keychainService.setKey('vaultcrm_ai_openai_key', config.openaiApiKey)
    } else {
      await keychainService.deleteKey('vaultcrm_ai_openai_key')
    }
  }
  
  if (config.anthropicApiKey !== undefined) {
    if (config.anthropicApiKey) {
      await keychainService.setKey('vaultcrm_ai_anthropic_key', config.anthropicApiKey)
    } else {
      await keychainService.deleteKey('vaultcrm_ai_anthropic_key')
    }
  }
}

/**
 * Save API key for a provider
 */
export async function saveApiKey(provider: 'openai' | 'anthropic', key: string): Promise<void> {
  const keyName = provider === 'openai' ? 'vaultcrm_ai_openai_key' : 'vaultcrm_ai_anthropic_key'
  await keychainService.setKey(keyName, key)
}

/**
 * Get API key for a provider
 */
export async function getApiKey(provider: 'openai' | 'anthropic'): Promise<string | null> {
  const keyName = provider === 'openai' ? 'vaultcrm_ai_openai_key' : 'vaultcrm_ai_anthropic_key'
  try {
    return await keychainService.getKey(keyName)
  } catch {
    return null
  }
}

/**
 * Redact email addresses from text
 */
export function redactEmails(text: string): string {
  return text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]')
}

/**
 * Redact phone numbers from text
 */
export function redactPhones(text: string): string {
  // Match various phone number formats
  return text.replace(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE_REDACTED]')
}

/**
 * Apply redaction based on settings
 */
export function applyRedaction(text: string, maskEmail: boolean, maskPhone: boolean): string {
  let result = text
  if (maskEmail) {
    result = redactEmails(result)
  }
  if (maskPhone) {
    result = redactPhones(result)
  }
  return result
}

/**
 * Check if local AI (Ollama) is available
 */
export async function checkLocalAIAvailable(): Promise<boolean> {
  const config = await getAIConfig()
  
  try {
    const response = await fetchWithTimeout(`${config.localEndpoint}/api/tags`, 3000)
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get available local models
 */
export async function getLocalModels(): Promise<string[]> {
  const config = await getAIConfig()
  
  try {
    const response = await fetch(`${config.localEndpoint}/api/tags`)
    if (!response.ok) return []
    
    const data = await response.json()
    return (data.models || []).map((m: { name: string }) => m.name)
  } catch {
    return []
  }
}

/**
 * Chat with AI
 */
export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const config = await getAIConfig()

  switch (config.provider) {
    case 'local':
      return chatWithOllama(config, messages)
    case 'openai':
      return chatWithOpenAI(config, messages)
    case 'anthropic':
      return chatWithAnthropic(config, messages)
    default:
      throw new Error('Unknown AI provider')
  }
}

/**
 * Chat with local Ollama
 */
async function chatWithOllama(config: AIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  const response = await fetch(`${config.localEndpoint}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model || 'llama3.2',
      messages,
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error('Failed to chat with Ollama')
  }

  const data = await response.json()
  return {
    content: data.message?.content || '',
    tokensUsed: data.eval_count
  }
}

/**
 * Chat with OpenAI
 */
async function chatWithOpenAI(config: AIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  if (!config.openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o-mini',
      messages
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI error: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.choices?.[0]?.message?.content || '',
    tokensUsed: data.usage?.total_tokens
  }
}

/**
 * Chat with Anthropic
 */
async function chatWithAnthropic(config: AIConfig, messages: ChatMessage[]): Promise<ChatResponse> {
  if (!config.anthropicApiKey) {
    throw new Error('Anthropic API key not configured')
  }

  // Convert messages format for Anthropic
  const systemMessage = messages.find(m => m.role === 'system')?.content || ''
  const conversationMessages = messages.filter(m => m.role !== 'system')

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 1024,
      system: systemMessage,
      messages: conversationMessages
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Anthropic error: ${error}`)
  }

  const data = await response.json()
  return {
    content: data.content?.[0]?.text || '',
    tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens
  }
}

// === AI Features ===

/**
 * Summarize notes
 */
export async function summarizeNotes(notes: string[]): Promise<string> {
  if (notes.length === 0) return ''

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a helpful assistant that summarizes CRM notes. Be concise and highlight key points.'
    },
    {
      role: 'user',
      content: `Summarize these notes about a contact:\n\n${notes.join('\n\n')}`
    }
  ]

  const response = await chat(messages)
  return response.content
}

/**
 * Suggest next follow-up action
 */
export async function suggestNextFollowUp(context: {
  contactName: string
  recentInteractions: string[]
  lastContactDate?: string
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a CRM assistant. Suggest a brief, actionable next follow-up based on the context. Be specific and practical.'
    },
    {
      role: 'user',
      content: `Contact: ${context.contactName}
Last contact: ${context.lastContactDate || 'Unknown'}
Recent interactions:
${context.recentInteractions.join('\n')}

What should be the next follow-up action?`
    }
  ]

  const response = await chat(messages)
  return response.content
}

/**
 * Auto-suggest tags based on notes
 */
export async function suggestTags(notes: string, existingTags: string[]): Promise<string[]> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are a CRM assistant. Suggest relevant tags based on the notes. 
Available tags: ${existingTags.join(', ')}
Only suggest tags from the available list. Return as comma-separated values.`
    },
    {
      role: 'user',
      content: notes
    }
  ]

  const response = await chat(messages)
  
  // Parse response
  const suggestedTags = response.content
    .split(',')
    .map(t => t.trim())
    .filter(t => existingTags.includes(t))

  return suggestedTags
}

/**
 * Draft email based on context
 */
export async function draftEmail(context: {
  contactName: string
  purpose: string
  previousEmails?: string[]
  tone?: 'formal' | 'friendly' | 'casual'
}): Promise<{ subject: string; body: string }> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `You are an email writing assistant. Write ${context.tone || 'friendly'} emails.
Return the email in this format:
Subject: [subject line]
---
[email body]`
    },
    {
      role: 'user',
      content: `Write an email to ${context.contactName}.
Purpose: ${context.purpose}
${context.previousEmails ? `Previous context:\n${context.previousEmails.join('\n')}` : ''}`
    }
  ]

  const response = await chat(messages)
  
  // Parse response
  const parts = response.content.split('---')
  const subjectLine = parts[0]?.replace('Subject:', '').trim() || context.purpose
  const body = parts[1]?.trim() || response.content

  return { subject: subjectLine, body }
}

/**
 * Generate meeting prep notes
 */
export async function generateMeetingPrep(context: {
  contactName: string
  company?: string
  meetingPurpose?: string
  recentNotes?: string[]
}): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: 'You are a CRM assistant preparing meeting notes. Be concise and actionable.'
    },
    {
      role: 'user',
      content: `Prepare brief meeting notes for a call with:
Name: ${context.contactName}
Company: ${context.company || 'Unknown'}
Purpose: ${context.meetingPurpose || 'General check-in'}
Recent notes: ${context.recentNotes?.join('\n') || 'None'}

Include: key talking points, questions to ask, and things to remember.`
    }
  ]

  const response = await chat(messages)
  return response.content
}

// Helper function
async function fetchWithTimeout(url: string, timeout: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      controller.abort()
      reject(new Error('Timeout'))
    }, timeout)

    fetch(url, { signal: controller.signal })
      .then(response => {
        clearTimeout(timer)
        resolve(response)
      })
      .catch(error => {
        clearTimeout(timer)
        reject(error)
      })
  })
}
