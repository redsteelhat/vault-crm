import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Contact } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search } from "lucide-react";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.contactList().then(setContacts).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered =
    search.trim() === ""
      ? contacts
      : contacts.filter(
          (c) =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (c.email ?? "").toLowerCase().includes(search.toLowerCase())
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kişiler</h1>
        <Button asChild>
          <Link to="/import">
            <UserPlus className="mr-2 h-4 w-4" />
            CSV Import
          </Link>
        </Button>
      </div>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İsim, şirket veya email ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} kişi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {filtered.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <Link
                  to={`/contacts/${c.id}`}
                  className="flex min-w-0 flex-1 flex-col hover:underline"
                >
                  <span className="font-medium">
                    {c.first_name} {c.last_name}
                  </span>
                  {(c.company || c.email) && (
                    <span className="truncate text-sm text-muted-foreground">
                      {[c.company, c.email].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </Link>
                <div className="ml-4 shrink-0 text-right text-sm text-muted-foreground">
                  <div>Son: {formatDate(c.last_touched_at)}</div>
                  <div>Sonraki: {formatDate(c.next_touch_at)}</div>
                </div>
                <Button variant="ghost" size="sm" asChild className="ml-2">
                  <Link to={`/contacts/${c.id}`}>Aç</Link>
                </Button>
              </li>
            ))}
          </ul>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              {search ? "Arama sonucu yok." : "Henüz kişi yok. CSV import ile ekleyebilirsin."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
