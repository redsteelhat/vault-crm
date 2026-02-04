import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Contact, type Note, type Reminder, type Company, type CustomValue } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, StickyNote, Bell, Pencil, Save, X } from "lucide-react";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
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
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState("note");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDays, setReminderDays] = useState(14);
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
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.contactGet(id),
      api.companyList(),
      api.noteList(id),
      api.reminderList().then((r) => r.filter((x) => x.contact_id === id)),
      api.contactCustomValuesGet(id),
    ])
      .then(([c, co, n, r, cv]) => {
        setContact(c ?? null);
        setCompanies(co ?? []);
        setNotes(n);
        setReminders(r);
        setCustomValues(cv ?? []);
        const cf: Record<string, string> = {};
        (cv ?? []).forEach((v) => {
          cf[v.field_id] = v.value ?? "";
        });
        setCustomForm(cf);
        if (c) {
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
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const addNote = () => {
    if (!id || !noteBody.trim()) return;
    api
      .noteCreate({
        contact_id: id,
        kind: noteKind,
        body: noteBody.trim(),
      })
      .then(() => {
        setNoteBody("");
        load();
      })
      .catch(console.error);
  };

  const addReminder = () => {
    if (!id || !reminderTitle.trim()) return;
    const d = new Date();
    d.setDate(d.getDate() + reminderDays);
    const dueAt = d.toISOString().slice(0, 19).replace("T", " ");
    api
      .reminderCreate({
        contact_id: id,
        title: reminderTitle.trim(),
        due_at: dueAt,
        recurring_days: null,
      })
      .then(() => {
        setReminderTitle("");
        load();
      })
      .catch(console.error);
  };

  const completeReminder = (reminderId: string) => {
    api.reminderComplete(reminderId).then(load).catch(console.error);
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
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">
          {loading ? "Yükleniyor…" : "Kişi bulunamadı."}
        </p>
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
                  <Label>Notlar (Markdown destekli)</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Kişiye özel notlar…"
                    rows={3}
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
                  <div className="mt-2 rounded border p-2 text-muted-foreground whitespace-pre-wrap">
                    {contact.notes}
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
              <div className="flex gap-2">
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
                <Textarea
                  placeholder="Not içeriği (Markdown desteklenir)…"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={2}
                  className="flex-1"
                />
              </div>
              <Button onClick={addNote} disabled={!noteBody.trim()}>
                Kaydet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <Bell className="h-4 w-4" />
              <CardTitle className="text-base">Hatırlatıcı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Örn: Follow-up"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                />
                <select
                  value={reminderDays}
                  onChange={(e) => setReminderDays(Number(e.target.value))}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value={7}>7 gün</option>
                  <option value={14}>14 gün</option>
                  <option value={30}>30 gün</option>
                </select>
              </div>
              <Button onClick={addReminder} disabled={!reminderTitle.trim()}>
                Hatırlatıcı ekle
              </Button>
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
                  <pre className="mt-1 whitespace-pre-wrap font-sans">{n.body}</pre>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {reminders.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Hatırlatıcılar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <span>{r.title} — {formatDate(r.due_at)}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => completeReminder(r.id)}
                  >
                    Tamamla
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
