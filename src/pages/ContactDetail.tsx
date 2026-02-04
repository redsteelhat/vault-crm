import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, type Contact, type Note, type Reminder } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, StickyNote, Bell } from "lucide-react";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("tr-TR");
  } catch {
    return s;
  }
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
  const [notes, setNotes] = useState<Note[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [noteKind, setNoteKind] = useState("note");
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderDays, setReminderDays] = useState(14);

  const load = () => {
    if (!id) return;
    Promise.all([
      api.contactGet(id),
      api.noteList(id),
      api.reminderList().then((r) => r.filter((x) => x.contact_id === id)),
    ])
      .then(([c, n, r]) => {
        setContact(c ?? null);
        setNotes(n);
        setReminders(r);
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
      <div className="mb-6 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contacts")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-semibold">
          {contact.first_name} {contact.last_name}
        </h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(contact.title || contact.company) && (
              <p>
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
            {contact.email && <p>Email: {contact.email}</p>}
            {contact.phone && <p>Tel: {contact.phone}</p>}
            {(contact.city || contact.country) && (
              <p>{[contact.city, contact.country].filter(Boolean).join(", ")}</p>
            )}
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
            <p className="text-muted-foreground">
              Son temas: {formatDate(contact.last_touched_at)} · Sonraki:{" "}
              {formatDate(contact.next_touch_at)}
            </p>
            {contact.notes && (
              <div className="mt-2 rounded border p-2 text-muted-foreground">
                {contact.notes}
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
                  placeholder="Not içeriği…"
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
            <CardTitle className="text-base">Notlar</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded border p-3 text-sm"
                >
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
