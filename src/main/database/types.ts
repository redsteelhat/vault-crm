// Core data types for VaultCRM

export interface Contact {
  id: string
  name: string
  company: string | null
  title: string | null
  emails: string // JSON array
  phones: string // JSON array
  location: string | null
  source: string | null
  notes: string | null
  last_contact_at: string | null
  created_at: string
  updated_at: string
}

export interface ContactWithTags extends Contact {
  tags: Tag[]
}

export interface Interaction {
  id: string
  contact_id: string
  type: 'note' | 'call' | 'meeting' | 'email'
  body: string
  occurred_at: string
  created_at: string
}

export interface InteractionWithContact extends Interaction {
  contact_name: string
  contact_company: string | null
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface ContactTag {
  contact_id: string
  tag_id: string
}

export interface FollowUp {
  id: string
  contact_id: string
  due_at: string
  reason: string | null
  status: 'open' | 'done' | 'snoozed'
  created_at: string
  done_at: string | null
}

export interface FollowUpWithContact extends FollowUp {
  contact_name: string
  contact_company: string | null
}

export interface Settings {
  key: string
  value: string
}

// Import/Export types
export interface CsvMapping {
  name: string
  email?: string
  company?: string
  title?: string
  phone?: string
  location?: string
  source?: string
  notes?: string
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export interface CsvPreview {
  headers: string[]
  rows: Record<string, string>[]
}

// Pipeline types
export interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

export interface Pipeline {
  id: string
  name: string
  stages: string // JSON array of PipelineStage
  is_default: number
  created_at: string
}

export interface Deal {
  id: string
  pipeline_id: string
  contact_id: string | null
  name: string
  value: number
  currency: string
  stage: string
  probability: number
  expected_close: string | null
  notes: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
  won: number | null
  deleted_at: string | null
}

export interface DealWithContact extends Deal {
  contact_name: string | null
  contact_company: string | null
}

// Task types
export interface Task {
  id: string
  contact_id: string | null
  deal_id: string | null
  title: string
  description: string | null
  due_at: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'open' | 'done' | 'cancelled'
  created_at: string
  completed_at: string | null
  deleted_at: string | null
}

export interface TaskWithRelations extends Task {
  contact_name: string | null
  deal_name: string | null
}

// Custom field types
export interface CustomFieldDefinition {
  id: string
  entity_type: 'contact' | 'deal' | 'task'
  name: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'email' | 'phone'
  options: string // JSON array
  required: number
  sort_order: number
  created_at: string
}

export interface CustomFieldValue {
  entity_id: string
  field_id: string
  value: string | null
}

// Automation types
export type AutomationTriggerType = 
  | 'tag_added' 
  | 'tag_removed' 
  | 'deal_stage_changed' 
  | 'contact_created' 
  | 'deal_created' 
  | 'followup_done' 
  | 'task_done'

export type AutomationActionType = 
  | 'add_tag' 
  | 'remove_tag' 
  | 'create_task' 
  | 'update_field' 
  | 'move_deal_stage' 
  | 'send_notification'

export interface AutomationRule {
  id: string
  name: string
  trigger_type: AutomationTriggerType
  trigger_config: string // JSON
  action_type: AutomationActionType
  action_config: string // JSON
  enabled: number
  run_count: number
  last_run_at: string | null
  created_at: string
}

// Email sync types
export interface EmailAccount {
  id: string
  provider: 'gmail' | 'outlook'
  email: string
  sync_enabled: number
  sync_emails: number
  sync_calendar: number
  last_email_sync_at: string | null
  last_calendar_sync_at: string | null
  created_at: string
}

export interface SyncedEmail {
  id: string
  account_id: string
  contact_id: string | null
  message_id: string
  thread_id: string | null
  subject: string | null
  snippet: string | null
  from_addr: string | null
  to_addr: string | null
  date: string
  is_read: number
  is_sent: number
  created_at: string
}

export interface CalendarEvent {
  id: string
  account_id: string
  contact_id: string | null
  event_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  location: string | null
  attendees: string // JSON array
  is_all_day: number
  created_at: string
}

// Email template types
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string // JSON array
  usage_count: number
  created_at: string
  updated_at: string
}

export interface Sequence {
  id: string
  name: string
  steps: string // JSON array of SequenceStep
  active: number
  created_at: string
  updated_at: string
}

export interface SequenceStep {
  delay_days: number
  template_id: string
  action: 'email' | 'task' | 'wait'
}

export interface SequenceEnrollment {
  id: string
  sequence_id: string
  contact_id: string
  current_step: number
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  next_action_at: string | null
  started_at: string
  completed_at: string | null
}
