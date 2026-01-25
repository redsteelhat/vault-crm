import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../sqlite/connection'
import type { CustomFieldDefinition, CustomFieldValue } from '../types'

// Custom Field Definitions
export function getAllFieldDefinitions(entityType?: 'contact' | 'deal' | 'task'): CustomFieldDefinition[] {
  if (entityType) {
    return query<CustomFieldDefinition>(
      'SELECT * FROM custom_field_definitions WHERE entity_type = ? ORDER BY sort_order ASC',
      [entityType]
    )
  }
  return query<CustomFieldDefinition>(
    'SELECT * FROM custom_field_definitions ORDER BY entity_type, sort_order ASC'
  )
}

export function getFieldDefinitionById(id: string): CustomFieldDefinition | null {
  return queryOne<CustomFieldDefinition>(
    'SELECT * FROM custom_field_definitions WHERE id = ?',
    [id]
  )
}

export function createFieldDefinition(
  data: Omit<CustomFieldDefinition, 'id' | 'created_at'>
): CustomFieldDefinition {
  const id = uuidv4()

  // Get max sort_order for this entity type
  const maxOrderResult = queryOne<{ max_order: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM custom_field_definitions WHERE entity_type = ?',
    [data.entity_type]
  )
  const sortOrder = (maxOrderResult?.max_order ?? -1) + 1

  run(`
    INSERT INTO custom_field_definitions (id, entity_type, name, field_type, options, required, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    data.entity_type,
    data.name,
    data.field_type,
    data.options || '[]',
    data.required || 0,
    sortOrder
  ])

  return getFieldDefinitionById(id)!
}

export function updateFieldDefinition(
  id: string,
  data: Partial<Omit<CustomFieldDefinition, 'id' | 'entity_type' | 'created_at'>>
): CustomFieldDefinition | null {
  const existing = getFieldDefinitionById(id)
  if (!existing) return null

  const updates: string[] = []
  const params: unknown[] = []

  if (data.name !== undefined) {
    updates.push('name = ?')
    params.push(data.name)
  }
  if (data.field_type !== undefined) {
    updates.push('field_type = ?')
    params.push(data.field_type)
  }
  if (data.options !== undefined) {
    updates.push('options = ?')
    params.push(data.options)
  }
  if (data.required !== undefined) {
    updates.push('required = ?')
    params.push(data.required)
  }
  if (data.sort_order !== undefined) {
    updates.push('sort_order = ?')
    params.push(data.sort_order)
  }

  if (updates.length === 0) return existing

  params.push(id)
  run(`UPDATE custom_field_definitions SET ${updates.join(', ')} WHERE id = ?`, params)

  return getFieldDefinitionById(id)
}

export function deleteFieldDefinition(id: string): void {
  // Delete all values for this field first
  run('DELETE FROM custom_field_values WHERE field_id = ?', [id])
  // Delete the definition
  run('DELETE FROM custom_field_definitions WHERE id = ?', [id])
}

export function reorderFieldDefinitions(entityType: string, orderedIds: string[]): void {
  orderedIds.forEach((id, index) => {
    run('UPDATE custom_field_definitions SET sort_order = ? WHERE id = ? AND entity_type = ?', [
      index,
      id,
      entityType
    ])
  })
}

// Custom Field Values
export function getFieldValues(entityId: string): CustomFieldValue[] {
  return query<CustomFieldValue>(
    'SELECT * FROM custom_field_values WHERE entity_id = ?',
    [entityId]
  )
}

export function getFieldValuesWithDefinitions(entityId: string): (CustomFieldValue & CustomFieldDefinition)[] {
  return query<CustomFieldValue & CustomFieldDefinition>(`
    SELECT cfv.*, cfd.entity_type, cfd.name, cfd.field_type, cfd.options, cfd.required, cfd.sort_order
    FROM custom_field_values cfv
    JOIN custom_field_definitions cfd ON cfv.field_id = cfd.id
    WHERE cfv.entity_id = ?
    ORDER BY cfd.sort_order ASC
  `, [entityId])
}

export function getFieldValue(entityId: string, fieldId: string): CustomFieldValue | null {
  return queryOne<CustomFieldValue>(
    'SELECT * FROM custom_field_values WHERE entity_id = ? AND field_id = ?',
    [entityId, fieldId]
  )
}

export function setFieldValue(entityId: string, fieldId: string, value: string | null): void {
  run(`
    INSERT OR REPLACE INTO custom_field_values (entity_id, field_id, value)
    VALUES (?, ?, ?)
  `, [entityId, fieldId, value])
}

export function setFieldValues(entityId: string, values: Record<string, string | null>): void {
  for (const [fieldId, value] of Object.entries(values)) {
    setFieldValue(entityId, fieldId, value)
  }
}

export function deleteFieldValue(entityId: string, fieldId: string): void {
  run(
    'DELETE FROM custom_field_values WHERE entity_id = ? AND field_id = ?',
    [entityId, fieldId]
  )
}

export function deleteAllFieldValues(entityId: string): void {
  run('DELETE FROM custom_field_values WHERE entity_id = ?', [entityId])
}

// Utility: Get entities by custom field value
export function getEntitiesByFieldValue(
  entityType: string,
  fieldId: string,
  value: string
): string[] {
  const results = query<{ entity_id: string }>(`
    SELECT cfv.entity_id
    FROM custom_field_values cfv
    JOIN custom_field_definitions cfd ON cfv.field_id = cfd.id
    WHERE cfd.entity_type = ? AND cfv.field_id = ? AND cfv.value = ?
  `, [entityType, fieldId, value])

  return results.map(r => r.entity_id)
}

// Bulk operations
export function bulkSetFieldValues(
  entities: { entityId: string; fieldId: string; value: string | null }[]
): void {
  for (const { entityId, fieldId, value } of entities) {
    setFieldValue(entityId, fieldId, value)
  }
}
