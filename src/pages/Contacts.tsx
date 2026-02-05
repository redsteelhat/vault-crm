import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Contact, type CustomField, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search } from "lucide-react";
import { getRelationshipHealthRecencyOnly, HEALTH_COLORS, type HealthStatus } from "@/lib/relationshipHealth";

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s.]*$/;
function isValidEmail(v: string): boolean {
  if (!v.trim()) return true;
  return EMAIL_RE.test(v.trim());
}
function isValidPhone(v: string): boolean {
  if (!v.trim()) return true;
  if (!PHONE_RE.test(v.trim())) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 6;
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [touchFilter, setTouchFilter] = useState<"" | "next_this_week" | "last_30_plus">("");
  const [fieldFilterId, setFieldFilterId] = useState<string>("");
  const [fieldFilterValue, setFieldFilterValue] = useState<string>("");
  const [fieldFilterIds, setFieldFilterIds] = useState<Set<string> | null>(null);
  const [hashtagFilterIds, setHashtagFilterIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const hashtagParam = searchParams.get("hashtag");
  const [showAdd, setShowAdd] = useState(false);
  const [validation, setValidation] = useState<{
    email?: boolean;
    email_secondary?: boolean;
    phone?: boolean;
    phone_secondary?: boolean;
  }>({});
  const [newForm, setNewForm] = useState({
    first_name: "",
    last_name: "",
    title: "",
    company: "",
    company_id: "",
    city: "",
    country: "",
    email: "",
    email_secondary: "",
    phone: "",
    phone_secondary: "",
    linkedin_url: "",
    twitter_url: "",
    website: "",
    notes: "",
  });

  const navigate = useNavigate();

  const filterFields = customFields.filter((f) => {
    if (f.kind !== "single_select" && f.kind !== "multi_select") return false;
    return parseOptions(f.options).length > 0;
  });
  const selectedFilterField = filterFields.find((f) => f.id === fieldFilterId);
  const selectedFilterOptions = selectedFilterField
    ? parseOptions(selectedFilterField.options)
    : [];

  useEffect(() => {
    setLoading(true);
    Promise.all([api.contactList(), api.customFieldList(), api.companyList()])
      .then(([c, f, co]) => {
        try {
          setContacts(Array.isArray(c) ? c : []);
          setCustomFields(Array.isArray(f) ? f : []);
          setCompanies(Array.isArray(co) ? co : []);
        } catch (e) {
          console.error(e);
          setContacts([]);
          setCustomFields([]);
          setCompanies([]);
        }
      })
      .catch((e) => {
        console.error(e);
        setContacts([]);
        setCustomFields([]);
        setCompanies([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!fieldFilterId || !fieldFilterValue) {
      setFieldFilterIds(null);
      return;
    }
    api
      .contactIdsByCustomValue(fieldFilterId, fieldFilterValue)
      .then((ids) => setFieldFilterIds(new Set(ids)))
      .catch(() => setFieldFilterIds(new Set()));
  }, [fieldFilterId, fieldFilterValue]);

  useEffect(() => {
    if (!hashtagParam?.trim()) {
      setHashtagFilterIds(null);
      return;
    }
    api
      .contactIdsWithHashtag(hashtagParam.trim())
      .then((ids) => setHashtagFilterIds(new Set(ids)))
      .catch(() => setHashtagFilterIds(new Set()));
  }, [hashtagParam]);

  const contactsList = Array.isArray(contacts) ? contacts : [];
  let filtered = contactsList;
  if (search.trim()) {
    filtered = filtered.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (c.email ?? "").toLowerCase().includes(search.toLowerCase())
    );
  }
  if (fieldFilterIds) {
    filtered = filtered.filter((c) => fieldFilterIds.has(c.id));
  }
  if (hashtagFilterIds) {
    filtered = filtered.filter((c) => hashtagFilterIds.has(c.id));
  }
  if (touchFilter === "next_this_week") {
    const now = new Date();
    const day = now.getDay();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    filtered = filtered.filter((c) => {
      const nt = c.next_touch_at ? new Date(c.next_touch_at) : null;
      return nt != null && nt >= mon && nt <= sun;
    });
  }
  if (touchFilter === "last_30_plus") {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((c) => {
      const lt = c.last_touched_at ? new Date(c.last_touched_at).getTime() : 0;
      return lt === 0 || lt <= cutoff;
    });
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  const createContact = () => {
    const emailOk = isValidEmail(newForm.email);
    const emailSecOk = isValidEmail(newForm.email_secondary);
    const phoneOk = isValidPhone(newForm.phone);
    const phoneSecOk = isValidPhone(newForm.phone_secondary);
    setValidation({
      email: !emailOk,
      email_secondary: !emailSecOk,
      phone: !phoneOk,
      phone_secondary: !phoneSecOk,
    });
    if (!emailOk || !emailSecOk || !phoneOk || !phoneSecOk) return;
    if (!newForm.first_name.trim() || !newForm.last_name.trim()) return;
    api
      .contactCreate({
        first_name: newForm.first_name.trim(),
        last_name: newForm.last_name.trim(),
        title: newForm.title.trim() || null,
        company: newForm.company.trim() || null,
        company_id: newForm.company_id || null,
        city: newForm.city.trim() || null,
        country: newForm.country.trim() || null,
        email: newForm.email.trim() || null,
        email_secondary: newForm.email_secondary.trim() || null,
        phone: newForm.phone.trim() || null,
        phone_secondary: newForm.phone_secondary.trim() || null,
        linkedin_url: newForm.linkedin_url.trim() || null,
        twitter_url: newForm.twitter_url.trim() || null,
        website: newForm.website.trim() || null,
        notes: newForm.notes.trim() || null,
      })
      .then((created) => {
        setShowAdd(false);
        setNewForm({
          first_name: "",
          last_name: "",
          title: "",
          company: "",
          company_id: "",
          city: "",
          country: "",
          email: "",
          email_secondary: "",
          phone: "",
          phone_secondary: "",
          linkedin_url: "",
          twitter_url: "",
          website: "",
          notes: "",
        });
        setValidation({});
        api.contactList().then(setContacts).catch(console.error);
        navigate(`/contacts/${created.id}`);
      })
      .catch(console.error);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kişiler</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdd((s) => !s)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Kişi ekle
          </Button>
          <Button asChild>
            <Link to="/import">CSV Import</Link>
          </Button>
        </div>
      </div>
      {showAdd && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Yeni kişi (A1)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad *</Label>
                <Input
                  placeholder="Ad"
                  value={newForm.first_name}
                  onChange={(e) => setNewForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Soyad *</Label>
                <Input
                  placeholder="Soyad"
                  value={newForm.last_name}
                  onChange={(e) => setNewForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Unvan / Rol</Label>
              <Input
                placeholder="Unvan / Rol"
                value={newForm.title}
                onChange={(e) => setNewForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={newForm.company_id}
                onChange={(e) => {
                  const cid = e.target.value;
                  const co = companies.find((c) => c.id === cid);
                  setNewForm((f) => ({
                    ...f,
                    company_id: cid,
                    company: co ? co.name : f.company,
                  }));
                }}
                className="h-10 min-w-[200px] flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Şirket seç —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Şirket (serbest metin)"
                value={newForm.company}
                onChange={(e) =>
                  setNewForm((f) => ({ ...f, company: e.target.value, company_id: "" }))
                }
                className="flex-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Şehir</Label>
                <Input
                  placeholder="Şehir"
                  value={newForm.city}
                  onChange={(e) => setNewForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Ülke</Label>
                <Input
                  placeholder="Ülke"
                  value={newForm.country}
                  onChange={(e) => setNewForm((f) => ({ ...f, country: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email (birincil)</Label>
              <Input
                type="email"
                placeholder="Email (birincil)"
                value={newForm.email}
                onChange={(e) => setNewForm((f) => ({ ...f, email: e.target.value }))}
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
                placeholder="Email (ek)"
                value={newForm.email_secondary}
                onChange={(e) => setNewForm((f) => ({ ...f, email_secondary: e.target.value }))}
                validation={validation.email_secondary ? "error" : "neutral"}
              />
              {validation.email_secondary && (
                <p className="text-xs text-destructive">Geçerli bir email girin.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Telefon (birincil)</Label>
              <Input
                placeholder="Telefon (birincil)"
                value={newForm.phone}
                onChange={(e) => setNewForm((f) => ({ ...f, phone: e.target.value }))}
                validation={validation.phone ? "error" : "neutral"}
              />
              {validation.phone && (
                <p className="text-xs text-destructive">Geçerli bir telefon girin.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Telefon (ek)</Label>
              <Input
                placeholder="Telefon (ek)"
                value={newForm.phone_secondary}
                onChange={(e) => setNewForm((f) => ({ ...f, phone_secondary: e.target.value }))}
                validation={validation.phone_secondary ? "error" : "neutral"}
              />
              {validation.phone_secondary && (
                <p className="text-xs text-destructive">Geçerli bir telefon girin.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>LinkedIn URL</Label>
              <Input
                placeholder="LinkedIn URL"
                value={newForm.linkedin_url}
                onChange={(e) => setNewForm((f) => ({ ...f, linkedin_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Twitter / X</Label>
              <Input
                placeholder="Twitter / X"
                value={newForm.twitter_url}
                onChange={(e) => setNewForm((f) => ({ ...f, twitter_url: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Web sitesi</Label>
              <Input
                placeholder="Web sitesi"
                value={newForm.website}
                onChange={(e) => setNewForm((f) => ({ ...f, website: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Notlar (Markdown)</Label>
              <Textarea
                placeholder="Notlar (Markdown)"
                value={newForm.notes}
                onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={createContact}
                disabled={!newForm.first_name.trim() || !newForm.last_name.trim()}
              >
                Kaydet
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="İsim, şirket veya email ile ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {hashtagParam && (
          <span className="inline-flex items-center gap-1 rounded-md border border-input bg-muted px-3 py-2 text-sm">
            Etiket: <strong>#{hashtagParam}</strong>
            <Link to="/contacts" className="ml-1 text-primary hover:underline">
              Kaldır
            </Link>
          </span>
        )}
        <select
          value={touchFilter}
          onChange={(e) => setTouchFilter(e.target.value as "" | "next_this_week" | "last_30_plus")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">Temas filtresi (B2.3)</option>
          <option value="next_this_week">Next touch bu hafta</option>
          <option value="last_30_plus">Last touched 30+ gün önce</option>
        </select>
        {filterFields.length > 0 && (
          <>
            <select
              value={fieldFilterId}
              onChange={(e) => {
                setFieldFilterId(e.target.value);
                setFieldFilterValue("");
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Özel alan filtresi</option>
              {filterFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
            {selectedFilterField && (
              <select
                value={fieldFilterValue}
                onChange={(e) => setFieldFilterValue(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Tümü</option>
                {selectedFilterOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
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
                  <span className="font-medium flex items-center gap-2">
                    {c.first_name} {c.last_name}
                    {(() => {
                      const r = getRelationshipHealthRecencyOnly(c);
                      const colors = HEALTH_COLORS[r.health as HealthStatus];
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${colors.bg} ${colors.text} ${colors.border}`}
                          title={`İlişki: ${r.label}`}
                        >
                          {r.label}
                        </span>
                      );
                    })()}
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
