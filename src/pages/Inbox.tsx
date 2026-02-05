/**
 * D2.1 — "Next action required" inbox: tüm kişilerin bugün/bu hafta next action'ları tek listede.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Contact, type Reminder } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox as InboxIcon } from "lucide-react";

function effectiveDueAt(r: Reminder): Date {
  return r.snooze_until?.trim() ? new Date(r.snooze_until) : new Date(r.due_at);
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

export function Inbox() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    Promise.all([api.reminderList(), api.contactList()])
      .then(([r, c]) => {
        setReminders(Array.isArray(r) ? r : []);
        setContacts(Array.isArray(c) ? c : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const contactMap = new Map(contacts.map((c) => [c.id, `${c.first_name} ${c.last_name}`.trim() || c.id]));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const weekEnd = new Date(todayStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const dueToday = reminders.filter((r) => {
    const d = effectiveDueAt(r);
    return d >= todayStart && d <= todayEnd;
  });
  const dueThisWeek = reminders.filter((r) => {
    const d = effectiveDueAt(r);
    return d > todayEnd && d <= weekEnd;
  });

  const snoozeReminder = (r: Reminder, value: string) => {
    if (!value) return;
    const until = new Date();
    if (value === "1h") until.setHours(until.getHours() + 1);
    else if (value === "1d") until.setDate(until.getDate() + 1);
    else if (value === "7d") until.setDate(until.getDate() + 7);
    else if (value === "14d") until.setDate(until.getDate() + 14);
    else if (value === "30d") until.setDate(until.getDate() + 30);
    api
      .reminderSnooze(r.id, until.toISOString().slice(0, 19).replace("T", " "))
      .then(load)
      .catch(console.error);
  };

  const completeReminder = (id: string) => {
    api.reminderComplete(id).then(load).catch(console.error);
  };

  const renderList = (list: Reminder[]) => (
    <ul className="space-y-2">
      {list.map((r) => {
        const effectiveDue = effectiveDueAt(r);
        const contactName = contactMap.get(r.contact_id) ?? r.contact_id;
        return (
          <li
            key={r.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border p-2"
          >
            <span className="min-w-0">
              <strong>{r.title}</strong>
              <span className="ml-2 text-muted-foreground">
                · {contactName} · {formatDate(effectiveDue.toISOString())}
              </span>
            </span>
            <div className="flex flex-wrap gap-1">
              <select
                className="h-8 rounded border border-input bg-background px-2 text-xs"
                value=""
                onChange={(e) => {
                  snoozeReminder(r, e.target.value);
                  e.target.value = "";
                }}
                title="Snooze"
              >
                <option value="">Snooze</option>
                <option value="1h">1 saat</option>
                <option value="1d">1 gün</option>
                <option value="7d">7 gün</option>
                <option value="14d">14 gün</option>
                <option value="30d">30 gün</option>
              </select>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/contacts/${r.contact_id}`}>Kişiye git</Link>
              </Button>
              <Button variant="outline" size="sm" onClick={() => completeReminder(r.id)}>
                Tamamla
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
        <InboxIcon className="h-6 w-6" />
        Next action required (D2.1)
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Tüm kişilerin bugün ve bu hafta next action'ları tek listede.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bugün yapılacaklar</CardTitle>
          </CardHeader>
          <CardContent>
            {dueToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bugün için next action yok.</p>
            ) : (
              renderList(dueToday)
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bu hafta yapılacaklar</CardTitle>
          </CardHeader>
          <CardContent>
            {dueThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">Bu hafta için next action yok.</p>
            ) : (
              renderList(dueThisWeek)
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
