import { v4 as uuid } from 'uuid'
import { getAllFromTable, getById, insert, update, remove, getContactTags } from '../connection'
import type { Tag } from '../types'

export function getAllTags(): Tag[] {
  return getAllFromTable<Tag>('tags').sort((a, b) => a.name.localeCompare(b.name))
}

export function getTagById(id: string): Tag | null {
  return getById<Tag>('tags', id)
}

export function getTagByName(name: string): Tag | null {
  return getAllTags().find(t => t.name.toLowerCase() === name.toLowerCase()) || null
}

export function createTag(data: Omit<Tag, 'id'>): Tag {
  const tag: Tag = {
    id: `tag_${uuid()}`,
    name: data.name,
    color: data.color
  }
  return insert('tags', tag)
}

export function updateTag(id: string, data: Partial<Tag>): Tag {
  const updated = update<Tag>('tags', id, data)
  if (!updated) throw new Error('Tag not found')
  return updated
}

export function deleteTag(id: string): void {
  remove('tags', id)
}

export function getTagUsageCount(tagId: string): number {
  return getContactTags().filter(ct => ct.tag_id === tagId).length
}

export function getTagsWithCounts(): (Tag & { count: number })[] {
  const contactTags = getContactTags()
  return getAllTags().map(tag => ({
    ...tag,
    count: contactTags.filter(ct => ct.tag_id === tag.id).length
  }))
}
