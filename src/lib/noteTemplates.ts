/**
 * C1.2 — Not şablonları: Meeting Notes, Follow-up, Intro, Intro requested, Send deck, Follow-up in X days.
 */

export interface NoteTemplate {
  id: string;
  label: string;
  kind: string;
  body: string;
  /** C1.3: Şablondan not açılınca varsayılan "X gün sonra hatırlat" değeri (0 = gösterme). */
  reminderDays?: number;
}

export const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: "meeting",
    label: "Meeting Notes",
    kind: "meeting",
    body: "## Toplantı notları\n\n- **Katılımcılar:**\n- **Gündem:**\n- **Aksiyonlar:**\n",
    reminderDays: 0,
  },
  {
    id: "followup",
    label: "Follow-up",
    kind: "followup",
    body: "## Follow-up\n\n",
    reminderDays: 7,
  },
  {
    id: "intro",
    label: "Intro",
    kind: "intro",
    body: "## Intro\n\n",
    reminderDays: 0,
  },
  {
    id: "intro_requested",
    label: "Intro requested",
    kind: "note",
    body: "## Intro requested\n\n",
    reminderDays: 0,
  },
  {
    id: "send_deck",
    label: "Send deck",
    kind: "note",
    body: "## Send deck\n\nDeck gönderildi.\n",
    reminderDays: 7,
  },
  {
    id: "followup_x",
    label: "Follow-up in X days",
    kind: "followup",
    body: "## Follow-up\n\nX gün sonra tekrar temas.\n",
    reminderDays: 14,
  },
];

export function getTemplateById(id: string): NoteTemplate | undefined {
  return NOTE_TEMPLATES.find((t) => t.id === id);
}
