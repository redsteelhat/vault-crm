import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { Pipeline, PipelineStage } from '../types'

export function getAllPipelines(): Pipeline[] {
  return query<Pipeline>('SELECT * FROM pipelines ORDER BY is_default DESC, name ASC')
}

export function getPipelineById(id: string): Pipeline | null {
  return queryOne<Pipeline>('SELECT * FROM pipelines WHERE id = ?', [id])
}

export function getDefaultPipeline(): Pipeline | null {
  return queryOne<Pipeline>('SELECT * FROM pipelines WHERE is_default = 1')
}

export function createPipeline(data: { name: string; stages?: PipelineStage[] }): Pipeline {
  const id = uuidv4()
  const stages = data.stages || [
    { id: 'lead', name: 'Lead', color: '#6366f1', order: 0 },
    { id: 'qualified', name: 'Qualified', color: '#8b5cf6', order: 1 },
    { id: 'proposal', name: 'Proposal', color: '#f59e0b', order: 2 },
    { id: 'negotiation', name: 'Negotiation', color: '#ef4444', order: 3 },
    { id: 'closed_won', name: 'Closed Won', color: '#10b981', order: 4 },
    { id: 'closed_lost', name: 'Closed Lost', color: '#6b7280', order: 5 }
  ]

  run(
    `INSERT INTO pipelines (id, name, stages, is_default) VALUES (?, ?, ?, ?)`,
    [id, data.name, JSON.stringify(stages), 0]
  )

  return getPipelineById(id)!
}

export function updatePipeline(id: string, data: Partial<{ name: string; stages: PipelineStage[] }>): Pipeline | null {
  const existing = getPipelineById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.stages !== undefined) {
    updates.push('stages = ?')
    params.push(JSON.stringify(data.stages))
  }

  if (updates.length === 0) return existing

  params.push(id)
  run(`UPDATE pipelines SET ${updates.join(', ')} WHERE id = ?`, params)

  return getPipelineById(id)
}

export function deletePipeline(id: string): boolean {
  const existing = getPipelineById(id)
  if (!existing || existing.is_default) return false

  run('DELETE FROM pipelines WHERE id = ?', [id])
  return true
}

export function setDefaultPipeline(id: string): boolean {
  const existing = getPipelineById(id)
  if (!existing) return false

  run('UPDATE pipelines SET is_default = 0')
  run('UPDATE pipelines SET is_default = 1 WHERE id = ?', [id])
  return true
}

export function getPipelineStages(pipelineId: string): PipelineStage[] {
  const pipeline = getPipelineById(pipelineId)
  if (!pipeline) return []
  try {
    return JSON.parse(pipeline.stages)
  } catch {
    return []
  }
}

export function getPipelineStats(pipelineId: string): {
  totalDeals: number
  totalValue: number
  byStage: { stage: string; count: number; value: number }[]
} {
  const totalResult = queryOne<{ count: number; value: number }>(
    `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as value 
     FROM deals WHERE pipeline_id = ? AND deleted_at IS NULL AND closed_at IS NULL`,
    [pipelineId]
  )

  const byStage = query<{ stage: string; count: number; value: number }>(
    `SELECT stage, COUNT(*) as count, COALESCE(SUM(value), 0) as value 
     FROM deals WHERE pipeline_id = ? AND deleted_at IS NULL AND closed_at IS NULL
     GROUP BY stage`,
    [pipelineId]
  )

  return {
    totalDeals: totalResult?.count || 0,
    totalValue: totalResult?.value || 0,
    byStage
  }
}
