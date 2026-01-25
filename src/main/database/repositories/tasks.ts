import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { Task, TaskWithRelations } from '../types'

export function getAllTasks(): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.deleted_at IS NULL
    ORDER BY 
      CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
      CASE 
        WHEN t.priority = 'urgent' THEN 0
        WHEN t.priority = 'high' THEN 1
        WHEN t.priority = 'medium' THEN 2
        WHEN t.priority = 'low' THEN 3
      END,
      t.due_at ASC NULLS LAST
  `)
}

export function getTaskById(id: string): TaskWithRelations | null {
  return queryOne<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.id = ? AND t.deleted_at IS NULL
  `, [id])
}

export function getTasksByContact(contactId: string): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.contact_id = ? AND t.deleted_at IS NULL
    ORDER BY t.status ASC, t.due_at ASC NULLS LAST
  `, [contactId])
}

export function getTasksByDeal(dealId: string): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.deal_id = ? AND t.deleted_at IS NULL
    ORDER BY t.status ASC, t.due_at ASC NULLS LAST
  `, [dealId])
}

export function getOpenTasks(): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.status = 'open' AND t.deleted_at IS NULL
    ORDER BY 
      CASE 
        WHEN t.priority = 'urgent' THEN 0
        WHEN t.priority = 'high' THEN 1
        WHEN t.priority = 'medium' THEN 2
        WHEN t.priority = 'low' THEN 3
      END,
      t.due_at ASC NULLS LAST
  `)
}

export function getTodayTasks(): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.status = 'open' AND t.deleted_at IS NULL
      AND date(t.due_at) = date('now')
    ORDER BY 
      CASE 
        WHEN t.priority = 'urgent' THEN 0
        WHEN t.priority = 'high' THEN 1
        WHEN t.priority = 'medium' THEN 2
        WHEN t.priority = 'low' THEN 3
      END,
      t.due_at ASC
  `)
}

export function getOverdueTasks(): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.status = 'open' AND t.deleted_at IS NULL
      AND date(t.due_at) < date('now')
    ORDER BY t.due_at ASC
  `)
}

export function getUpcomingTasks(days: number = 7): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.status = 'open' AND t.deleted_at IS NULL
      AND date(t.due_at) > date('now')
      AND date(t.due_at) <= date('now', '+' || ? || ' days')
    ORDER BY t.due_at ASC
  `, [days])
}

export function createTask(data: Omit<Task, 'id' | 'created_at' | 'completed_at' | 'deleted_at'>): Task {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(`
    INSERT INTO tasks (id, contact_id, deal_id, title, description, due_at, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.contact_id,
    data.deal_id,
    data.title,
    data.description,
    data.due_at,
    data.priority || 'medium',
    data.status || 'open',
    now
  ])

  return getTaskById(id)!
}

export function updateTask(id: string, data: Partial<Task>): Task | null {
  const existing = getTaskById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []

  if (data.title !== undefined) {
    updates.push('title = ?')
    params.push(data.title)
  }
  if (data.description !== undefined) {
    updates.push('description = ?')
    params.push(data.description)
  }
  if (data.contact_id !== undefined) {
    updates.push('contact_id = ?')
    params.push(data.contact_id)
  }
  if (data.deal_id !== undefined) {
    updates.push('deal_id = ?')
    params.push(data.deal_id)
  }
  if (data.due_at !== undefined) {
    updates.push('due_at = ?')
    params.push(data.due_at)
  }
  if (data.priority !== undefined) {
    updates.push('priority = ?')
    params.push(data.priority)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }

  if (updates.length === 0) return existing

  params.push(id)
  run(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params)

  return getTaskById(id)
}

export function completeTask(id: string): Task | null {
  const now = new Date().toISOString()
  run('UPDATE tasks SET status = ?, completed_at = ? WHERE id = ?', ['done', now, id])
  return getTaskById(id)
}

export function reopenTask(id: string): Task | null {
  run('UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?', ['open', id])
  return getTaskById(id)
}

export function cancelTask(id: string): Task | null {
  run('UPDATE tasks SET status = ? WHERE id = ?', ['cancelled', id])
  return getTaskById(id)
}

export function deleteTask(id: string): void {
  const now = new Date().toISOString()
  run('UPDATE tasks SET deleted_at = ? WHERE id = ?', [now, id])
}

export function hardDeleteTask(id: string): void {
  run('DELETE FROM tasks WHERE id = ?', [id])
}

export function getTaskCount(): { open: number; overdue: number; completed: number } {
  const openResult = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'open' AND deleted_at IS NULL"
  )
  const overdueResult = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'open' AND deleted_at IS NULL AND date(due_at) < date('now')"
  )
  const completedResult = queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND deleted_at IS NULL"
  )

  return {
    open: openResult?.count || 0,
    overdue: overdueResult?.count || 0,
    completed: completedResult?.count || 0
  }
}

export function getTasksForAgenda(date: string): TaskWithRelations[] {
  return query<TaskWithRelations>(`
    SELECT t.*, c.name as contact_name, d.name as deal_name
    FROM tasks t
    LEFT JOIN contacts c ON t.contact_id = c.id
    LEFT JOIN deals d ON t.deal_id = d.id
    WHERE t.deleted_at IS NULL
      AND date(t.due_at) = date(?)
    ORDER BY 
      CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
      CASE 
        WHEN t.priority = 'urgent' THEN 0
        WHEN t.priority = 'high' THEN 1
        WHEN t.priority = 'medium' THEN 2
        WHEN t.priority = 'low' THEN 3
      END
  `, [date])
}
