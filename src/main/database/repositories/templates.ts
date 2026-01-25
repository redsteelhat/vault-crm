import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { EmailTemplate, Sequence, SequenceEnrollment } from '../types'

// Email Templates
export function getAllTemplates(): EmailTemplate[] {
  return query<EmailTemplate>(
    'SELECT * FROM email_templates ORDER BY usage_count DESC, name ASC'
  )
}

export function getTemplateById(id: string): EmailTemplate | null {
  return queryOne<EmailTemplate>(
    'SELECT * FROM email_templates WHERE id = ?',
    [id]
  )
}

export function createTemplate(data: Omit<EmailTemplate, 'id' | 'usage_count' | 'created_at' | 'updated_at'>): EmailTemplate {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(`
    INSERT INTO email_templates (id, name, subject, body, variables, usage_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name,
    data.subject,
    data.body,
    data.variables || '[]',
    0,
    now,
    now
  ])

  return getTemplateById(id)!
}

export function updateTemplate(id: string, data: Partial<EmailTemplate>): EmailTemplate | null {
  const existing = getTemplateById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const params: unknown[] = [now]

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.subject !== undefined) {
    updates.push('subject = ?')
    params.push(data.subject)
  }
  if (data.body !== undefined) {
    updates.push('body = ?')
    params.push(data.body)
  }
  if (data.variables !== undefined) {
    updates.push('variables = ?')
    params.push(data.variables)
  }

  params.push(id)
  run(`UPDATE email_templates SET ${updates.join(', ')} WHERE id = ?`, params)

  return getTemplateById(id)
}

export function deleteTemplate(id: string): void {
  run('DELETE FROM email_templates WHERE id = ?', [id])
}

export function incrementTemplateUsage(id: string): void {
  run('UPDATE email_templates SET usage_count = usage_count + 1 WHERE id = ?', [id])
}

// Render template with variables
export function renderTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  }

  return { subject, body }
}

// Sequences
export function getAllSequences(): Sequence[] {
  return query<Sequence>(
    'SELECT * FROM sequences ORDER BY name ASC'
  )
}

export function getActiveSequences(): Sequence[] {
  return query<Sequence>(
    'SELECT * FROM sequences WHERE active = 1 ORDER BY name ASC'
  )
}

export function getSequenceById(id: string): Sequence | null {
  return queryOne<Sequence>(
    'SELECT * FROM sequences WHERE id = ?',
    [id]
  )
}

export function createSequence(data: Omit<Sequence, 'id' | 'created_at' | 'updated_at'>): Sequence {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(`
    INSERT INTO sequences (id, name, steps, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.name,
    data.steps || '[]',
    data.active ?? 1,
    now,
    now
  ])

  return getSequenceById(id)!
}

export function updateSequence(id: string, data: Partial<Sequence>): Sequence | null {
  const existing = getSequenceById(id)
  if (!existing) return null

  const now = new Date().toISOString()
  const updates: string[] = ['updated_at = ?']
  const params: unknown[] = [now]

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.steps !== undefined) {
    updates.push('steps = ?')
    params.push(data.steps)
  }
  if (data.active !== undefined) {
    updates.push('active = ?')
    params.push(data.active)
  }

  params.push(id)
  run(`UPDATE sequences SET ${updates.join(', ')} WHERE id = ?`, params)

  return getSequenceById(id)
}

export function deleteSequence(id: string): void {
  run('DELETE FROM sequence_enrollments WHERE sequence_id = ?', [id])
  run('DELETE FROM sequences WHERE id = ?', [id])
}

// Sequence Enrollments
export function getEnrollmentsBySequence(sequenceId: string): SequenceEnrollment[] {
  return query<SequenceEnrollment>(
    'SELECT * FROM sequence_enrollments WHERE sequence_id = ? ORDER BY started_at DESC',
    [sequenceId]
  )
}

export function getEnrollmentsByContact(contactId: string): SequenceEnrollment[] {
  return query<SequenceEnrollment>(
    'SELECT * FROM sequence_enrollments WHERE contact_id = ? ORDER BY started_at DESC',
    [contactId]
  )
}

export function getActiveEnrollments(): SequenceEnrollment[] {
  return query<SequenceEnrollment>(
    "SELECT * FROM sequence_enrollments WHERE status = 'active' ORDER BY next_action_at ASC"
  )
}

export function getEnrollmentById(id: string): SequenceEnrollment | null {
  return queryOne<SequenceEnrollment>(
    'SELECT * FROM sequence_enrollments WHERE id = ?',
    [id]
  )
}

export function enrollContact(sequenceId: string, contactId: string): SequenceEnrollment {
  // Check if already enrolled
  const existing = queryOne<SequenceEnrollment>(
    "SELECT * FROM sequence_enrollments WHERE sequence_id = ? AND contact_id = ? AND status = 'active'",
    [sequenceId, contactId]
  )

  if (existing) {
    throw new Error('Contact is already enrolled in this sequence')
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  // Calculate next action time based on first step
  const sequence = getSequenceById(sequenceId)
  let nextActionAt: string | null = null
  if (sequence) {
    try {
      const steps = JSON.parse(sequence.steps)
      if (steps.length > 0) {
        const delayDays = steps[0].delay_days || 0
        nextActionAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString()
      }
    } catch {
      // Invalid steps JSON
    }
  }

  run(`
    INSERT INTO sequence_enrollments (id, sequence_id, contact_id, current_step, status, next_action_at, started_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [id, sequenceId, contactId, 0, 'active', nextActionAt, now])

  return getEnrollmentById(id)!
}

export function updateEnrollment(id: string, data: Partial<SequenceEnrollment>): SequenceEnrollment | null {
  const existing = getEnrollmentById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []

  if (data.current_step !== undefined) {
    updates.push('current_step = ?')
    params.push(data.current_step)
  }
  if (data.status !== undefined) {
    updates.push('status = ?')
    params.push(data.status)
  }
  if (data.next_action_at !== undefined) {
    updates.push('next_action_at = ?')
    params.push(data.next_action_at)
  }
  if (data.completed_at !== undefined) {
    updates.push('completed_at = ?')
    params.push(data.completed_at)
  }

  if (updates.length === 0) return existing

  params.push(id)
  run(`UPDATE sequence_enrollments SET ${updates.join(', ')} WHERE id = ?`, params)

  return getEnrollmentById(id)
}

export function pauseEnrollment(id: string): SequenceEnrollment | null {
  return updateEnrollment(id, { status: 'paused' })
}

export function resumeEnrollment(id: string): SequenceEnrollment | null {
  return updateEnrollment(id, { status: 'active' })
}

export function cancelEnrollment(id: string): SequenceEnrollment | null {
  return updateEnrollment(id, { status: 'cancelled' })
}

export function completeEnrollment(id: string): SequenceEnrollment | null {
  return updateEnrollment(id, { 
    status: 'completed', 
    completed_at: new Date().toISOString() 
  })
}

export function advanceEnrollment(id: string): SequenceEnrollment | null {
  const enrollment = getEnrollmentById(id)
  if (!enrollment || enrollment.status !== 'active') return null

  const sequence = getSequenceById(enrollment.sequence_id)
  if (!sequence) return null

  try {
    const steps = JSON.parse(sequence.steps)
    const nextStep = enrollment.current_step + 1

    if (nextStep >= steps.length) {
      return completeEnrollment(id)
    }

    const delayDays = steps[nextStep].delay_days || 0
    const nextActionAt = new Date(Date.now() + delayDays * 24 * 60 * 60 * 1000).toISOString()

    return updateEnrollment(id, {
      current_step: nextStep,
      next_action_at: nextActionAt
    })
  } catch {
    return null
  }
}
