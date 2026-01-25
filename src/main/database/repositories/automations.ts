import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { AutomationRule, AutomationTriggerType, AutomationActionType } from '../types'

export function getAllRules(): AutomationRule[] {
  return query<AutomationRule>(
    'SELECT * FROM automation_rules ORDER BY created_at DESC'
  )
}

export function getEnabledRules(): AutomationRule[] {
  return query<AutomationRule>(
    'SELECT * FROM automation_rules WHERE enabled = 1 ORDER BY created_at DESC'
  )
}

export function getRuleById(id: string): AutomationRule | null {
  return queryOne<AutomationRule>(
    'SELECT * FROM automation_rules WHERE id = ?',
    [id]
  )
}

export function getRulesByTrigger(triggerType: AutomationTriggerType): AutomationRule[] {
  return query<AutomationRule>(
    'SELECT * FROM automation_rules WHERE trigger_type = ? AND enabled = 1',
    [triggerType]
  )
}

export function createRule(
  data: Omit<AutomationRule, 'id' | 'run_count' | 'last_run_at' | 'created_at'>
): AutomationRule {
  const id = uuidv4()

  run(`
    INSERT INTO automation_rules (id, name, trigger_type, trigger_config, action_type, action_config, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name,
    data.trigger_type,
    data.trigger_config || '{}',
    data.action_type,
    data.action_config || '{}',
    data.enabled ?? 1
  ])

  return getRuleById(id)!
}

export function updateRule(
  id: string,
  data: Partial<Omit<AutomationRule, 'id' | 'run_count' | 'last_run_at' | 'created_at'>>
): AutomationRule | null {
  const existing = getRuleById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.trigger_type !== undefined) {
    updates.push('trigger_type = ?')
    params.push(data.trigger_type)
  }
  if (data.trigger_config !== undefined) {
    updates.push('trigger_config = ?')
    params.push(data.trigger_config)
  }
  if (data.action_type !== undefined) {
    updates.push('action_type = ?')
    params.push(data.action_type)
  }
  if (data.action_config !== undefined) {
    updates.push('action_config = ?')
    params.push(data.action_config)
  }
  if (data.enabled !== undefined) {
    updates.push('enabled = ?')
    params.push(data.enabled)
  }

  if (updates.length === 0) return existing

  params.push(id)
  run(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?`, params)

  return getRuleById(id)
}

export function toggleRule(id: string, enabled: boolean): AutomationRule | null {
  run('UPDATE automation_rules SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id])
  return getRuleById(id)
}

export function deleteRule(id: string): void {
  run('DELETE FROM automation_rules WHERE id = ?', [id])
}

export function recordRuleExecution(id: string): void {
  const now = new Date().toISOString()
  run(
    'UPDATE automation_rules SET run_count = run_count + 1, last_run_at = ? WHERE id = ?',
    [now, id]
  )
}

export function getRuleStats(): {
  total: number
  enabled: number
  totalRuns: number
  byTrigger: { trigger_type: string; count: number }[]
  byAction: { action_type: string; count: number }[]
} {
  const totalResult = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM automation_rules'
  )
  const enabledResult = queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM automation_rules WHERE enabled = 1'
  )
  const runsResult = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(run_count), 0) as total FROM automation_rules'
  )
  const byTrigger = query<{ trigger_type: string; count: number }>(
    'SELECT trigger_type, COUNT(*) as count FROM automation_rules GROUP BY trigger_type'
  )
  const byAction = query<{ action_type: string; count: number }>(
    'SELECT action_type, COUNT(*) as count FROM automation_rules GROUP BY action_type'
  )

  return {
    total: totalResult?.count || 0,
    enabled: enabledResult?.count || 0,
    totalRuns: runsResult?.total || 0,
    byTrigger,
    byAction
  }
}

// Utility types for trigger/action configs
export interface TagTriggerConfig {
  tagId: string
  tagName?: string
}

export interface DealStageTriggerConfig {
  fromStage?: string
  toStage?: string
  pipelineId?: string
}

export interface AddTagActionConfig {
  tagId: string
  tagName?: string
}

export interface CreateTaskActionConfig {
  title: string
  description?: string
  dueDays?: number
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface UpdateFieldActionConfig {
  fieldId: string
  value: string
}

export interface MoveDealStageActionConfig {
  toStage: string
}

export interface NotificationActionConfig {
  title: string
  body: string
}
