// Tauri invoke wrapper — all data local, no cloud.
import { invoke } from "@tauri-apps/api/core";

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  title: string | null;
  company: string | null;
  company_id: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  email_secondary: string | null;
  phone: string | null;
  phone_secondary: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
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
  company_id?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  email_secondary?: string | null;
  phone?: string | null;
  phone_secondary?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  website?: string | null;
  notes?: string | null;
  /** B2.2: Sonraki temas tarihi */
  next_touch_at?: string | null;
}

export interface Company {
  id: string;
  name: string;
  domain: string | null;
  industry: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyInput {
  name: string;
  domain?: string | null;
  industry?: string | null;
  notes?: string | null;
}

export interface UpdateCompanyInput {
  name: string;
  domain?: string | null;
  industry?: string | null;
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

export interface Interaction {
  id: string;
  contact_id: string;
  kind: string;
  happened_at: string;
  summary: string | null;
  created_at: string;
}

export interface CreateInteractionInput {
  contact_id: string;
  kind: string;
  happened_at: string;
  summary?: string | null;
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

/** C2.1 — Global arama sonucu */
export interface GlobalSearchNoteHit {
  note_id: string;
  contact_id: string;
  contact_name: string;
  body_snippet: string;
  created_at: string;
}

export interface GlobalSearchResult {
  contacts: Contact[];
  companies: Company[];
  note_hits: GlobalSearchNoteHit[];
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

export interface CustomField {
  id: string;
  name: string;
  kind: string;
  options: string | null;
  sort_order: number;
  created_at: string;
}

export interface CustomValue {
  field_id: string;
  field_name: string;
  kind: string;
  options: string | null;
  value: string | null;
}

export interface CreateCustomFieldInput {
  name: string;
  kind: string;
  options?: string | null;
}

export interface CustomValueInput {
  field_id: string;
  value?: string | null;
}

export interface Attachment {
  id: string;
  owner_type: string;
  owner_id: string;
  file_name: string;
  mime: string | null;
  size: number | null;
  storage_path: string;
  created_at: string;
}

export interface AttachmentCreateInput {
  owner_type: "contact" | "company";
  owner_id: string;
  file_name: string;
  mime?: string | null;
  bytes: number[];
}

export interface DedupCandidate {
  a: Contact;
  b: Contact;
  reasons: string[];
}

export interface MergeContactInput {
  primary_id: string;
  secondary_id: string;
  merged: CreateContactInput;
  custom_values?: CustomValueInput[];
}

export const api = {
  contactList: () => invoke<Contact[]>("contact_list"),
  contactGet: (id: string) => invoke<Contact | null>("contact_get", { id }),
  contactCreate: (input: CreateContactInput) =>
    invoke<Contact>("contact_create", { input }),
  contactUpdate: (id: string, input: CreateContactInput) =>
    invoke<Contact>("contact_update", { id, input }),
  contactDelete: (id: string) => invoke<void>("contact_delete", { id }),
  companyList: () => invoke<Company[]>("company_list"),
  companyGet: (id: string) => invoke<Company | null>("company_get", { id }),
  companyCreate: (input: CreateCompanyInput) =>
    invoke<Company>("company_create", { input }),
  companyUpdate: (id: string, input: UpdateCompanyInput) =>
    invoke<Company>("company_update", { id, input }),
  contactListByCompany: (companyId: string) =>
    invoke<Contact[]>("contact_list_by_company", { companyId }),
  customFieldList: () => invoke<CustomField[]>("custom_field_list"),
  customFieldCreate: (input: CreateCustomFieldInput) =>
    invoke<CustomField>("custom_field_create", { input }),
  contactCustomValuesGet: (contactId: string) =>
    invoke<CustomValue[]>("contact_custom_values_get", { contactId }),
  contactCustomValuesSet: (contactId: string, values: CustomValueInput[]) =>
    invoke<void>("contact_custom_values_set", { contactId, values }),
  contactIdsByCustomValue: (fieldId: string, value: string) =>
    invoke<string[]>("contact_ids_by_custom_value", { fieldId, value }),
  noteList: (contactId: string) => invoke<Note[]>("note_list", { contactId }),
  noteCreate: (input: CreateNoteInput) => invoke<Note>("note_create", { input }),
  interactionList: (contactId: string) =>
    invoke<Interaction[]>("interaction_list", { contactId }),
  interactionCreate: (input: CreateInteractionInput) =>
    invoke<Interaction>("interaction_create", { input }),
  reminderList: () => invoke<Reminder[]>("reminder_list"),
  reminderCreate: (input: CreateReminderInput) =>
    invoke<Reminder>("reminder_create", { input }),
  reminderComplete: (id: string) => invoke<void>("reminder_complete", { id }),
  reminderSnooze: (id: string, until: string) =>
    invoke<void>("reminder_snooze", { id, until }),
  attachmentsDirGet: () => invoke<string>("attachments_dir_get"),
  attachmentsDirSet: (path: string) =>
    invoke<void>("attachments_dir_set", { path }),
  attachmentList: (ownerType: "contact" | "company", ownerId: string) =>
    invoke<Attachment[]>("attachment_list", { ownerType, ownerId }),
  attachmentAdd: (input: AttachmentCreateInput) =>
    invoke<Attachment>("attachment_add", { input }),
  attachmentDelete: (id: string) => invoke<void>("attachment_delete", { id }),
  attachmentOpen: (id: string) => invoke<string>("attachment_open", { id }),
  importContacts: (rows: ImportRow[]) =>
    invoke<number>("import_contacts", { rows }),
  searchContacts: (q: string) => invoke<string[]>("search_contacts", { q }),
  globalSearch: (q: string) =>
    invoke<GlobalSearchResult>("global_search", { q }),
  contactIdsWithHashtag: (hashtag: string) =>
    invoke<string[]>("contact_ids_with_hashtag", { hashtag }),
  dedupCandidates: () => invoke<DedupCandidate[]>("dedup_candidates"),
  contactMerge: (input: MergeContactInput) =>
    invoke<Contact>("contact_merge", { input }),
};
