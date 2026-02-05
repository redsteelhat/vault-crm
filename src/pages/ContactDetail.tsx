import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  api,
  type Contact,
  type Note,
  type Reminder,
  type Company,
  type CustomValue,
  type Attachment,
  type Interaction,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, StickyNote, Bell, Pencil, Save, X, Calendar, Phone, Mail, MessageCircle } from "lucide-react";
import { open } from "@tauri-apps/plugin-shell";
import { getRelationshipHealth, HEALTH_COLORS, type HealthStatus } from "@/lib/relationshipHealth";
import { MarkdownView } from "@/components/MarkdownView";
import { NOTE_TEMPLATES, getTemplateById } from "@/lib/noteTemplates";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
}

function formatBytes(bytes: number | null | undefined) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function parseOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    return JSON.parse(options) as string[];
  } catch {
    return [];
  }
}

function parseMultiValue(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }
}

// A1.2: Email/phone format doğrulama
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s.]*$/;
function isValidEmail(v: string | null): boolean {
  if (!v?.trim()) return true;
  return EMAIL_RE.test(v.trim());
}
function isValidPhone(v: string | null): boolean {
  if (!v?.trim()) return true;
  if (!PHONE_RE.test(v.trim())) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 6;
}

const NOTE_KINDS = [
  { value: "note", label: "Not" },
  { value: "meeting", label: "Meeting Notes" },
  { value: "followup", label: "Follow-up" },
  { value: "intro", label: "Intro" },
];

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState("note");
  const [notePreview, setNotePreview] = useState(false);
  const [noteTemplateId, setNoteTemplateId] = useState("");
  const [noteReminderDays, setNoteReminderDays] = useState(0);
  const [formNotesPreview, setFormNotesPreview] = useState(false);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDays, setReminderDays] = useState(14);
  const [reminderDueDateTime, setReminderDueDateTime] = useState("");
  const [reminderRecurringDays, setReminderRecurringDays] = useState(0);
  const [interactionKind, setInteractionKind] = useState<"meeting" | "call" | "email" | "dm">("meeting");
  const [interactionDate, setInteractionDate] = useState(() =>
    new Date().toISOString().slice(0, 16)
  );
  const [interactionSummary, setInteractionSummary] = useState("");
  const [interactionFollowUpDays, setInteractionFollowUpDays] = useState(0);
  const [form, setForm] = useState<Record<string, string>>({});
  const [customValues, setCustomValues] = useState<CustomValue[]>([]);
  const [customForm, setCustomForm] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<{
    email?: boolean;
    email_secondary?: boolean;
    phone?: boolean;
    phone_secondary?: boolean;
  }>({});

  const load = () => {
    const rawId = id?.trim();
    if (!rawId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      api.contactGet(rawId),
      api.companyList(),
      api.noteList(rawId),
      api.interactionList(rawId),
      api.reminderList().then((r) => (Array.isArray(r) ? r : []).filter((x) => x.contact_id === rawId)),
      api.contactCustomValuesGet(rawId),
      api.attachmentList("contact", rawId),
    ])
      .then(([c, co, n, ints, r, cv, at]) => {
        try {
          setContact(c ?? null);
          setCompanies(Array.isArray(co) ? co : []);
          setNotes(Array.isArray(n) ? n : []);
          setInteractions(Array.isArray(ints) ? ints : []);
          setReminders(Array.isArray(r) ? r : []);
          setCustomValues(Array.isArray(cv) ? cv : []);
          setAttachments(Array.isArray(at) ? at : []);
          const cf: Record<string, string> = {};
          (Array.isArray(cv) ? cv : []).forEach((v) => {
            cf[v.field_id] = v.value ?? "";
          });
          setCustomForm(cf);
          if (c && typeof c === "object") {
            const nextTouch = c.next_touch_at ?? "";
            setForm({
              first_name: c.first_name ?? "",
              last_name: c.last_name ?? "",
              title: c.title ?? "",
              company: c.company ?? "",
              company_id: c.company_id ?? "",
              city: c.city ?? "",
              country: c.country ?? "",
              email: c.email ?? "",
              email_secondary: c.email_secondary ?? "",
              phone: c.phone ?? "",
              phone_secondary: c.phone_secondary ?? "",
              linkedin_url: c.linkedin_url ?? "",
              twitter_url: c.twitter_url ?? "",
              website: c.website ?? "",
              notes: c.notes ?? "",
              next_touch_at: nextTouch ? nextTouch.slice(0, 16) : "",
            });
          }
        } catch (e) {
          console.error(e);
          setContact(null);
        }
      })
      .catch((e) => {
        console.error(e);
        setContact(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const addNote = () => {
    if (!id || !noteBody.trim()) return;
    const reminderDays = noteReminderDays;
    api
      .noteCreate({
        contact_id: id,
        kind: noteKind,
        body: noteBody.trim(),
      })
      .then((created) => {
        if (reminderDays > 0 && id) {
          const d = new Date();
          d.setDate(d.getDate() + reminderDays);
          return api.reminderCreate({
            contact_id: id,
            note_id: created.id,
            title: "Not hatırlatıcı",
            due_at: d.toISOString().slice(0, 19).replace("T", " "),
            recurring_days: null,
          });
        }
      })
      .then(() => {
        setNoteBody("");
        setNoteReminderDays(0);
        setNoteTemplateId("");
        load();
      })
      .catch(console.error);
  };

  const applyNoteTemplate = (templateId: string) => {
    setNoteTemplateId(templateId);
    const t = getTemplateById(templateId);
    if (t) {
      setNoteKind(t.kind);
      setNoteBody(t.body);
      setNoteReminderDays(t.reminderDays ?? 0);
    }
  };

  const addInteraction = () => {
    if (!id) return;
    const happenedAt = new Date(interactionDate).toISOString();
    api
      .interactionCreate({
        contact_id: id,
        kind: interactionKind,
        happened_at: happenedAt,
        summary: interactionSummary.trim() || null,
      })
      .then(() => {
        if (interactionFollowUpDays > 0 && id) {
          const d = new Date(interactionDate);
          d.setDate(d.getDate() + interactionFollowUpDays);
          return api.contactUpdate(id, {
            first_name: form.first_name?.trim() ?? "",
            last_name: form.last_name?.trim() ?? "",
            title: form.title?.trim() || null,
            company: form.company?.trim() || null,
            company_id: form.company_id || null,
            city: form.city?.trim() || null,
            country: form.country?.trim() || null,
            email: form.email?.trim() || null,
            email_secondary: form.email_secondary?.trim() || null,
            phone: form.phone?.trim() || null,
            phone_secondary: form.phone_secondary?.trim() || null,
            linkedin_url: form.linkedin_url?.trim() || null,
            twitter_url: form.twitter_url?.trim() || null,
            website: form.website?.trim() || null,
            notes: form.notes?.trim() || null,
            next_touch_at: d.toISOString(),
          });
        }
      })
      .then(() => {
        setInteractionSummary("");
        setInteractionDate(new Date().toISOString().slice(0, 16));
        load();
      })
      .catch(console.error);
  };

  const addReminder = () => {
    if (!id || !reminderTitle.trim()) return;
    const dueAt = reminderDueDateTime.trim()
      ? new Date(reminderDueDateTime.trim()).toISOString().slice(0, 19).replace("T", " ")
      : (() => {
          const d = new Date();
          d.setDate(d.getDate() + reminderDays);
          return d.toISOString().slice(0, 19).replace("T", " ");
        })();
    api
      .reminderCreate({
        contact_id: id,
        title: reminderTitle.trim(),
        due_at: dueAt,
        recurring_days: reminderRecurringDays > 0 ? reminderRecurringDays : null,
      })
      .then(() => {
        setReminderTitle("");
        setReminderDueDateTime("");
        setReminderRecurringDays(0);
        load();
      })
      .catch(console.error);
  };

  const completeReminder = (reminderId: string) => {
    api.reminderComplete(reminderId).then(load).catch(console.error);
  };

  const snoozeReminder = (reminderId: string, until: Date) => {
    const untilStr = until.toISOString().slice(0, 19).replace("T", " ");
    api.reminderSnooze(reminderId, untilStr).then(load).catch(console.error);
  };

  const addAttachment = async () => {
    if (!id || !attachFile) return;
    setAttachUploading(true);
    setAttachError(null);
    try {
      const buffer = await attachFile.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      await api.attachmentAdd({
        owner_type: "contact",
        owner_id: id,
        file_name: attachFile.name,
        mime: attachFile.type || null,
        bytes,
      });
      setAttachFile(null);
      load();
    } catch (e) {
      setAttachError(String(e));
    } finally {
      setAttachUploading(false);
    }
  };

  const openAttachment = (att: Attachment) => {
    api
      .attachmentOpen(att.id)
      .then((path) => open(path))
      .catch(console.error);
  };

  const deleteAttachment = (att: Attachment) => {
    api.attachmentDelete(att.id).then(load).catch(console.error);
  };

  const saveContact = () => {
    if (!id) return;
    const emailOk = isValidEmail(form.email || null);
    const emailSecOk = isValidEmail(form.email_secondary || null);
    const phoneOk = isValidPhone(form.phone || null);
    const phoneSecOk = isValidPhone(form.phone_secondary || null);
    setValidation({
      email: !emailOk,
      email_secondary: !emailSecOk,
      phone: !phoneOk,
      phone_secondary: !phoneSecOk,
    });
    if (!emailOk || !emailSecOk || !phoneOk || !phoneSecOk) return;
    api
      .contactUpdate(id, {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        title: form.title.trim() || null,
        company: form.company.trim() || null,
        company_id: form.company_id || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        email: form.email.trim() || null,
        email_secondary: form.email_secondary.trim() || null,
        phone: form.phone.trim() || null,
        phone_secondary: form.phone_secondary.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        twitter_url: form.twitter_url.trim() || null,
        website: form.website.trim() || null,
        notes: form.notes.trim() || null,
        next_touch_at: form.next_touch_at?.trim() ? new Date(form.next_touch_at.trim()).toISOString() : null,
      })
      .then(() =>
        api.contactCustomValuesSet(
          id,
          Object.entries(customForm).map(([field_id, value]) => {
            const field = customValues.find((cv) => cv.field_id === field_id);
            if (field?.kind === "multi_select") {
              const selected = parseMultiValue(value);
              return {
                field_id,
                value: selected.length > 0 ? JSON.stringify(selected) : null,
              };
            }
            return {
              field_id,
              value: value?.trim() || null,
            };
          })
        )
      )
      .then(() => {
        setEditing(false);
        load();
      })
      .catch(console.error);
  };

  if (loading || !contact) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            {loading ? "Yükleniyor…" : id ? "Kişi bulunamadı." : "Geçersiz bağlantı."}
          </p>
          {!loading && (
            <Button variant="outline" className="mt-4" onClick={() => navigate("/contacts")}>
              Kişiler listesine dön
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-semibold">
            {contact.first_name} {contact.last_name}
          </h1>
          {(() => {
            const result = getRelationshipHealth(contact, interactions);
            const colors = HEALTH_COLORS[result.health as HealthStatus];
            return (
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                title={`Recency: ${result.recencyDays != null ? result.recencyDays + " gün önce" : "—"} · Son ${result.frequencyInPeriod} temas`}
              >
                {result.label}
              </span>
            );
          })()}
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              İptal
            </Button>
            <Button size="sm" onClick={saveContact}>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Kişi kartı (A1)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ad</Label>
                    <Input
                      value={form.first_name}
                      onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                      placeholder="Ad"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Soyad</Label>
                    <Input
                      value={form.last_name}
                      onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                      placeholder="Soyad"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Unvan / Rol</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Örn. CEO, Investor"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Şirket (serbest metin veya listeden)</Label>
                  <div className="flex gap-2">
                    <select
                      value={form.company_id}
                      onChange={(e) => {
                        const cid = e.target.value;
                        const co = companies.find((c) => c.id === cid);
                        setForm((f) => ({
                          ...f,
                          company_id: cid,
                          company: co ? co.name : f.company,
                        }));
                      }}
                      className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">— Şirket seç —</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      value={form.company}
                      onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                      placeholder="Şirket adı"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Şehir</Label>
                    <Input
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Şehir"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ülke</Label>
                    <Input
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                      placeholder="Ülke"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email (birincil)</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    validation={validation.email ? "error" : "neutral"}
                  />
                  {validation.email && (
                    <p className="text-xs text-destructive">Geçerli bir email girin.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Email (ek)</Label>
                  <Input
                    type="email"
                    value={form.email_secondary}
                    onChange={(e) => setForm((f) => ({ ...f, email_secondary: e.target.value }))}
                    placeholder="İkinci email"
                    validation={validation.email_secondary ? "error" : "neutral"}
                  />
                  {validation.email_secondary && (
                    <p className="text-xs text-destructive">Geçerli bir email girin.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Telefon (birincil)</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+90 5xx xxx xx xx"
                    validation={validation.phone ? "error" : "neutral"}
                  />
                  {validation.phone && (
                    <p className="text-xs text-destructive">Geçerli bir telefon girin.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Telefon (ek)</Label>
                  <Input
                    value={form.phone_secondary}
                    onChange={(e) => setForm((f) => ({ ...f, phone_secondary: e.target.value }))}
                    placeholder="İkinci telefon"
                    validation={validation.phone_secondary ? "error" : "neutral"}
                  />
                  {validation.phone_secondary && (
                    <p className="text-xs text-destructive">Geçerli bir telefon girin.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={form.linkedin_url}
                    onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Twitter / X</Label>
                  <Input
                    value={form.twitter_url}
                    onChange={(e) => setForm((f) => ({ ...f, twitter_url: e.target.value }))}
                    placeholder="https://x.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Web sitesi</Label>
                  <Input
                    value={form.website}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Notlar (Markdown destekli)</Label>
                    <Button
                      type="button"
                      variant={formNotesPreview ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setFormNotesPreview((p) => !p)}
                    >
                      {formNotesPreview ? "Düzenle" : "Önizleme"}
                    </Button>
                  </div>
                  {formNotesPreview ? (
                    <div className="rounded border border-input bg-muted/30 p-3 min-h-[80px]">
                      <MarkdownView source={form.notes ?? ""} />
                    </div>
                  ) : (
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Kişiye özel notlar…"
                      rows={3}
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Sonraki temas (Next touch)</Label>
                  <Input
                    type="datetime-local"
                    value={form.next_touch_at ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, next_touch_at: e.target.value }))}
                  />
                </div>
                {customValues.length > 0 && (
                  <div className="space-y-3 border-t pt-4">
                    <Label className="text-base">Özel alanlar (A3)</Label>
                    {customValues.map((cv) => {
                      const options = parseOptions(cv.options);
                      if (cv.kind === "single_select" && options.length > 0) {
                        return (
                          <div key={cv.field_id} className="space-y-2">
                            <Label>{cv.field_name}</Label>
                            <select
                              value={customForm[cv.field_id] ?? ""}
                              onChange={(e) => setCustomForm((f) => ({ ...f, [cv.field_id]: e.target.value }))}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              <option value="">—</option>
                              {options.map((o) => (
                                <option key={o} value={o}>{o}</option>
                              ))}
                            </select>
                          </div>
                        );
                      }
                      if (cv.kind === "multi_select" && options.length > 0) {
                        const selected = parseMultiValue(customForm[cv.field_id]);
                        return (
                          <div key={cv.field_id} className="space-y-2">
                            <Label>{cv.field_name}</Label>
                            <div className="flex flex-wrap gap-2">
                              {options.map((o) => {
                                const checked = selected.includes(o);
                                return (
                                  <label key={o} className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const next = e.target.checked
                                          ? [...selected, o]
                                          : selected.filter((v) => v !== o);
                                        setCustomForm((f) => ({
                                          ...f,
                                          [cv.field_id]: JSON.stringify(next),
                                        }));
                                      }}
                                    />
                                    {o}
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      if (cv.kind === "number") {
                        return (
                          <div key={cv.field_id} className="space-y-2">
                            <Label>{cv.field_name}</Label>
                            <Input
                              type="number"
                              value={customForm[cv.field_id] ?? ""}
                              onChange={(e) => setCustomForm((f) => ({ ...f, [cv.field_id]: e.target.value }))}
                            />
                          </div>
                        );
                      }
                      if (cv.kind === "date") {
                        return (
                          <div key={cv.field_id} className="space-y-2">
                            <Label>{cv.field_name}</Label>
                            <Input
                              type="date"
                              value={customForm[cv.field_id] ?? ""}
                              onChange={(e) => setCustomForm((f) => ({ ...f, [cv.field_id]: e.target.value }))}
                            />
                          </div>
                        );
                      }
                      return (
                        <div key={cv.field_id} className="space-y-2">
                          <Label>{cv.field_name}</Label>
                          <Input
                            value={customForm[cv.field_id] ?? ""}
                            onChange={(e) => setCustomForm((f) => ({ ...f, [cv.field_id]: e.target.value }))}
                            placeholder={cv.field_name}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {(contact.title || contact.company) && (
                  <p>
                    {[contact.title, contact.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                {contact.email && <p>Email: {contact.email}</p>}
                {contact.email_secondary && <p>Email (ek): {contact.email_secondary}</p>}
                {contact.phone && <p>Tel: {contact.phone}</p>}
                {contact.phone_secondary && <p>Tel (ek): {contact.phone_secondary}</p>}
                {(contact.city || contact.country) && (
                  <p>{[contact.city, contact.country].filter(Boolean).join(", ")}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {contact.linkedin_url && (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                  )}
                  {contact.twitter_url && (
                    <a
                      href={contact.twitter_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      X
                    </a>
                  )}
                  {contact.website && (
                    <a
                      href={contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Web
                    </a>
                  )}
                </div>
                <p className="text-muted-foreground">
                  Son temas: {formatDate(contact.last_touched_at)} · Sonraki:{" "}
                  {formatDate(contact.next_touch_at)}
                </p>
                {contact.notes && (
                  <div className="mt-2 rounded border p-2 text-muted-foreground">
                    <MarkdownView source={contact.notes} />
                  </div>
                )}
                {customValues.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-sm font-medium text-muted-foreground">Özel alanlar</p>
                    <ul className="space-y-1 text-sm">
                      {customValues
                        .filter((cv) => cv.value != null && cv.value !== "")
                        .map((cv) => {
                          const displayValue =
                            cv.kind === "multi_select"
                              ? parseMultiValue(cv.value).join(", ")
                              : cv.value;
                          if (!displayValue) return null;
                          return (
                            <li key={cv.field_id}>
                              <span className="text-muted-foreground">{cv.field_name}:</span>{" "}
                              {displayValue}
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <StickyNote className="h-4 w-4" />
              <CardTitle className="text-base">Not ekle</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={noteTemplateId}
                  onChange={(e) => applyNoteTemplate(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Şablon seç (C1.2)</option>
                  {NOTE_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <select
                  value={noteKind}
                  onChange={(e) => setNoteKind(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {NOTE_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant={notePreview ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setNotePreview((p) => !p)}
                >
                  {notePreview ? "Düzenle" : "Önizleme"}
                </Button>
              </div>
              {notePreview ? (
                <div className="rounded border border-input bg-muted/30 p-3 min-h-[80px]">
                  <MarkdownView source={noteBody} />
                </div>
              ) : (
                <Textarea
                  placeholder="Not içeriği (Markdown desteklenir)…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={4}
                  className="flex-1"
                />
              )}
              <div className="flex flex-wrap gap-2 items-center">
                <Label className="text-xs">C1.3 X gün sonra hatırlat</Label>
                <select
                  value={noteReminderDays}
                  onChange={(e) => setNoteReminderDays(Number(e.target.value))}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={0}>Yok</option>
                  <option value={3}>3 gün</option>
                  <option value={7}>7 gün</option>
                  <option value={14}>14 gün</option>
                  <option value={30}>30 gün</option>
                </select>
                <Button onClick={addNote} disabled={!noteBody.trim()}>
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Calendar className="h-4 w-4" />
              <CardTitle className="text-base">Etkileşim (B1)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Meeting yaptık / Arama / Email / DM — tarih + kısa özet
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "meeting" as const, label: "Toplantı", Icon: Calendar },
                  { value: "call" as const, label: "Arama", Icon: Phone },
                  { value: "email" as const, label: "Email", Icon: Mail },
                  { value: "dm" as const, label: "DM", Icon: MessageCircle },
                ].map(({ value, label, Icon }) => (
                  <Button
                    key={value}
                    variant={interactionKind === value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setInteractionKind(value)}
                  >
                    <Icon className="mr-1 h-3.5 w-3.5" />
                    {label}
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Tarih / saat</Label>
                  <Input
                    type="datetime-local"
                    value={interactionDate}
                    onChange={(e) => setInteractionDate(e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
              <Textarea
                placeholder="Kısa özet / not…"
                value={interactionSummary}
                onChange={(e) => setInteractionSummary(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <div className="space-y-1">
                <Label className="text-xs">B2.2 Follow-up: Sonraki temas tarihi</Label>
                <select
                  value={interactionFollowUpDays}
                  onChange={(e) => setInteractionFollowUpDays(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={0}>Yok</option>
                  <option value={3}>3 gün sonra hatırlat</option>
                  <option value={7}>7 gün sonra hatırlat</option>
                  <option value={14}>14 gün sonra hatırlat</option>
                  <option value={30}>30 gün sonra hatırlat</option>
                </select>
              </div>
              <Button onClick={addInteraction} size="sm">
                Etkileşim ekle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Bell className="h-4 w-4" />
              <CardTitle className="text-base">Next action (D1.2)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Her kişi için tek next action + tarih/saat; bildirim bu tarihte (D1.1)
              </p>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Örn: Follow-up"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="min-w-[140px]"
                />
                <Input
                  type="datetime-local"
                  value={reminderDueDateTime}
                  onChange={(e) => setReminderDueDateTime(e.target.value)}
                  className="min-w-[180px]"
                />
                <span className="self-center text-sm text-muted-foreground">veya</span>
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={7}>7 gün</option>
                  <option value={14}>14 gün</option>
                  <option value={30}>30 gün</option>
                </select>
                <select
                  value={reminderRecurringDays}
                  onChange={(e) => setReminderRecurringDays(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  title="D1.4 Her X günde bir"
                >
                  <option value={0}>Tekrarsız</option>
                  <option value={7}>Her 7 günde bir</option>
                  <option value={14}>Her 14 günde bir</option>
                  <option value={30}>Her 30 günde bir</option>
                </select>
              </div>
              <Button onClick={addReminder} disabled={!reminderTitle.trim()}>
                Hatırlatıcı ekle
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ek dosyalar (A6)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm"
              />
              {attachError && (
                <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                  {attachError}
                </p>
              )}
              <Button onClick={addAttachment} disabled={!attachFile || attachUploading}>
                {attachUploading ? "Yükleniyor…" : "Ekle"}
              </Button>
              <ul className="divide-y">
                {attachments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.file_name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAttachment(a)}>
                        Aç
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteAttachment(a)}>
                        Sil
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {attachments.length === 0 && (
                <p className="text-sm text-muted-foreground">Henüz ek dosya yok.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {notes.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Notlar (timeline)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded border p-3 text-sm">
                  <span className="text-muted-foreground">{n.kind}</span> ·{" "}
                  {formatDate(n.created_at)}
                  <div className="mt-1">
                    <MarkdownView source={n.body} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {reminders.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Hatırlatıcılar (Next action)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reminders.map((r) => {
                const effectiveDue = r.snooze_until?.trim()
                  ? formatDate(r.snooze_until)
                  : formatDate(r.due_at);
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
                  >
                    <span className="min-w-0">
                      {r.title} — {effectiveDue}
                      {r.recurring_days != null && r.recurring_days > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (her {r.recurring_days} gün)
                        </span>
                      )}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      <select
                        className="h-8 rounded border border-input bg-background px-2 text-xs"
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          const until = new Date();
                          if (v === "1h") until.setHours(until.getHours() + 1);
                          else if (v === "1d") until.setDate(until.getDate() + 1);
                          else if (v === "7d") until.setDate(until.getDate() + 7);
                          else if (v === "14d") until.setDate(until.getDate() + 14);
                          else if (v === "30d") until.setDate(until.getDate() + 30);
                          snoozeReminder(r.id, until);
                          e.target.value = "";
                        }}
                        title="D1.3 Snooze"
                      >
                        <option value="">Snooze</option>
                        <option value="1h">1 saat</option>
                        <option value="1d">1 gün</option>
                        <option value="7d">7 gün</option>
                        <option value="14d">14 gün</option>
                        <option value="30d">30 gün</option>
                      </select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => completeReminder(r.id)}
                      >
                        Tamamla
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {(interactions.length > 0 || contact) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Etkileşim timeline (B1.2)</CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Kronolojik liste · Son temas: {formatDate(contact?.last_touched_at ?? null)}
            </p>
          </CardHeader>
          <CardContent>
            {interactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz etkileşim kaydı yok. Yukarıdan ekleyin.</p>
            ) : (
              <ul className="space-y-2">
                {interactions.map((i) => (
                  <li key={i.id} className="rounded border p-3 text-sm">
                    <span className="font-medium capitalize text-muted-foreground">{i.kind}</span>
                    {" · "}
                    <span>{formatDate(i.happened_at)}</span>
                    {i.summary && (
                      <>
                        <br />
                        <span className="text-muted-foreground">{i.summary}</span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
