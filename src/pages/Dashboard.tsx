import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api, type Contact, type Reminder, type CustomField } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Bell, UserPlus, Calendar, UserX, UserCheck } from "lucide-react";

function effectiveDueAt(r: Reminder): Date {
  return r.snooze_until?.trim() ? new Date(r.snooze_until) : new Date(r.due_at);
}

async function showDueReminderNotifications(reminders: Reminder[]) {
  try {
    const { isPermissionGranted, requestPermission, sendNotification } = await import(
      "@tauri-apps/plugin-notification"
    );
    let granted = await isPermissionGranted();
    if (!granted) {
      const permission = await requestPermission();
      granted = permission === "granted";
    }
    if (!granted) return;
    const now = new Date();
    for (const r of reminders) {
      const due = effectiveDueAt(r);
      if (due <= now) {
        sendNotification({ title: "VaultCRM: Hatırlatıcı", body: r.title });
      }
    }
  } catch {
    // Not in Tauri or notification not available
  }
}

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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

export function Dashboard() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [stageStats, setStageStats] = useState<{ label: string; count: number }[]>([]);

  const notifiedDue = useRef<Set<string>>(new Set());
  useEffect(() => {
    Promise.all([api.contactList(), api.reminderList(), api.customFieldList()])
      .then(async ([c, r, fields]) => {
        setContacts(c);
        setReminders(r);
        const now = new Date();
        const due = r.filter((x) => effectiveDueAt(x) <= now);
        const toNotify = due.filter((x) => !notifiedDue.current.has(x.id));
        toNotify.forEach((x) => notifiedDue.current.add(x.id));
        if (toNotify.length > 0) showDueReminderNotifications(toNotify);

        const stageField = (fields ?? []).find(
          (f: CustomField) => f.id === "cf_stage" || f.name === "Stage"
        );
        if (stageField) {
          const options = parseOptions(stageField.options);
          const counts = await Promise.all(
            options.map(async (label) => {
              const ids = await api.contactIdsByCustomValue(stageField.id, label);
              return { label, count: ids.length };
            })
          );
          setStageStats(counts);
        } else {
          setStageStats([]);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const dueSoon = reminders
    .filter((r) => {
      const d = effectiveDueAt(r);
      const now = new Date();
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d >= now && d <= week;
    })
    .slice(0, 5);

  // E2.1: Next touch bu hafta olan kişiler
  const now = new Date();
  const weekMon = new Date(now);
  weekMon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  weekMon.setHours(0, 0, 0, 0);
  const weekSun = new Date(weekMon);
  weekSun.setDate(weekMon.getDate() + 6);
  weekSun.setHours(23, 59, 59, 999);
  const nextTouchThisWeek = contacts.filter((c) => {
    const nt = c.next_touch_at ? new Date(c.next_touch_at) : null;
    return nt != null && nt >= weekMon && nt <= weekSun;
  });

  // E2.2: Last touched > 30 gün (veya hiç dokunulmamış)
  const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const lastTouched30Plus = contacts.filter((c) => {
    const lt = c.last_touched_at ? new Date(c.last_touched_at).getTime() : 0;
    return lt === 0 || lt <= cutoff30;
  });

  // E2.3: Son X günde eklenen kişiler (X = 7)
  const createdWithinDays = 7;
  const createdCutoff = Date.now() - createdWithinDays * 24 * 60 * 60 * 1000;
  const recentlyCreated = contacts.filter((c) => new Date(c.created_at).getTime() >= createdCutoff);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam kişi
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{contacts.length}</p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link to="/contacts">Tümünü gör →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bekleyen hatırlatıcı
            </CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{reminders.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hızlı işlem
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/import">CSV Import</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* E2: Genişletilebilir widget'lar — E2.1, E2.2, E2.3, E2.4 (stage/tag ileride eklenebilir) */}
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* E2.1: Bu hafta temas edilmesi gerekenler (next touch bu hafta) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bu hafta temas edilmesi gerekenler (E2.1)
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{nextTouchThisWeek.length}</p>
            <p className="text-xs text-muted-foreground">Next touch bu hafta olan kişiler</p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link to="/contacts?touch=next_this_week">Tümünü gör →</Link>
            </Button>
            {nextTouchThisWeek.length > 0 && nextTouchThisWeek.length <= 5 && (
              <ul className="mt-2 space-y-1 text-sm">
                {nextTouchThisWeek.map((c) => (
                  <li key={c.id}>
                    <Link to={`/contacts/${c.id}`} className="text-primary hover:underline">
                      {c.first_name} {c.last_name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* E2.2: 30+ gündür dokunmadıkların */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              30+ gündür dokunmadıkların (E2.2)
            </CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{lastTouched30Plus.length}</p>
            <p className="text-xs text-muted-foreground">Last touched &gt; 30 gün</p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link to="/contacts?touch=last_30_plus">Tümünü gör →</Link>
            </Button>
          </CardContent>
        </Card>

        {/* E2.3: Yeni import edilenler */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Yeni import edilenler (E2.3)
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{recentlyCreated.length}</p>
            <p className="text-xs text-muted-foreground">Son {createdWithinDays} günde eklenen</p>
            <Button variant="link" className="mt-2 h-auto p-0" asChild>
              <Link to={`/contacts?createdWithin=${createdWithinDays}`}>Tümünü gör →</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {dueSoon.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Bu hafta hatırlatıcılar (next action)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {dueSoon.map((r) => {
                const effectiveDue = effectiveDueAt(r);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                    <span>{r.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(effectiveDue.toISOString())}
                    </span>
                    <div className="flex gap-1">
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
                          api.reminderSnooze(r.id, until.toISOString().slice(0, 19).replace("T", " ")).then(() => {
                            api.reminderList().then(setReminders).catch(console.error);
                          }).catch(console.error);
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
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/contacts/${r.contact_id}`}>Kişiye git</Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
      {/* E2.4: Genişletilebilir — stage pipeline, tag dağılımı vb. ileride eklenebilir */}
      {stageStats.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Stage dağılımı (A3 / E2.4 widget)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {stageStats.map((s) => (
                <li key={s.label} className="flex items-center justify-between">
                  <span>{s.label}</span>
                  <span className="font-medium">{s.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
