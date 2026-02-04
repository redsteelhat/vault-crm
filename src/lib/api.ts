// Tauri invoke wrapper — all data local, no cloud.
import { invoke } from "@tauri-apps/api/core";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  website: string | null;
  notes: string | null;
  last_touched_at: string | null;
  next_touch_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateContactInput {
  first_name: string;
  last_name: string;
  title?: string | null;
  company?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
  notes?: string | null;
}

export interface Note {
  id: string;
  contact_id: string;
  kind: string;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CreateNoteInput {
  contact_id: string;
  kind?: string | null;
  title?: string | null;
  body: string;
}

export interface Reminder {
  id: string;
  contact_id: string;
  note_id: string | null;
  title: string;
  due_at: string;
  snooze_until: string | null;
  recurring_days: number | null;
  completed_at: string | null;
  created_at: string;
}

export interface CreateReminderInput {
  contact_id: string;
  note_id?: string | null;
  title: string;
  due_at: string;
  recurring_days?: number | null;
}

export interface ImportRow {
  first_name?: string | null;
  last_name?: string | null;
  title?: string | null;
  company?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  website?: string | null;
}

export const api = {
  contactList: () => invoke<Contact[]>("contact_list"),
  contactGet: (id: string) => invoke<Contact | null>("contact_get", { id }),
  contactCreate: (input: CreateContactInput) =>
    invoke<Contact>("contact_create", { input }),
  contactUpdate: (id: string, input: CreateContactInput) =>
    invoke<Contact>("contact_update", { id, input }),
  contactDelete: (id: string) => invoke<void>("contact_delete", { id }),
  noteList: (contactId: string) => invoke<Note[]>("note_list", { contactId }),
  noteCreate: (input: CreateNoteInput) => invoke<Note>("note_create", { input }),
  reminderList: () => invoke<Reminder[]>("reminder_list"),
  reminderCreate: (input: CreateReminderInput) =>
    invoke<Reminder>("reminder_create", { input }),
  reminderComplete: (id: string) => invoke<void>("reminder_complete", { id }),
  reminderSnooze: (id: string, until: string) =>
    invoke<void>("reminder_snooze", { id, until }),
  importContacts: (rows: ImportRow[]) =>
    invoke<number>("import_contacts", { rows }),
  searchContacts: (q: string) => invoke<string[]>("search_contacts", { q }),
};
