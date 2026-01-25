import { getSetting as getSettingFromDb, setSetting as setSettingToDb, getDatabase } from '../connection'
import type { Settings } from '../types'

export function getSetting(key: string): string | null {
  return getSettingFromDb(key)
}

export function setSetting(key: string, value: string): void {
  setSettingToDb(key, value)
}

export function getAllSettings(): Settings[] {
  const settings = getDatabase().settings
  return Object.entries(settings).map(([key, value]) => ({ key, value }))
}

export function deleteSetting(key: string): void {
  delete getDatabase().settings[key]
}
