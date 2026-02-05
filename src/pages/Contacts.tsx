import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Contact, type CustomField, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Search, Bookmark, Trash2 } from "lucide-react";
import { getRelationshipHealthRecencyOnly, HEALTH_COLORS, type HealthStatus } from "@/lib/relationshipHealth";
import {
  getSavedViews,
  saveSavedView,
  deleteSavedView,
  type SavedView,
  type SavedViewFilters,
} from "@/lib/savedViews";

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
  const [ftsSearchIds, setFtsSearchIds] = useState<Set<string> | null>(null);
  const [cityFilter, setCityFilter] = useState("");
  const [filterMode, setFilterMode] = useState<"and" | "or">("and");
  const [savedViews, setSavedViews] = useState<SavedView[]>(() => getSavedViews());
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const hashtagParam = searchParams.get("hashtag");
  // setSearchParams used by applySavedView (E1.3)
  const [showAdd, setShowAdd] = useState(false);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const [saveViewName, setSaveViewName] = useState("");
  const savedViewsRef = useRef<HTMLDivElement>(null);
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
    if (!showSavedViews) return;
    const onDocClick = (e: MouseEvent) => {
      if (savedViewsRef.current && !savedViewsRef.current.contains(e.target as Node))
        setShowSavedViews(false);
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [showSavedViews]);

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

  // E1.1: Full-text search (SQLite FTS) when search non-empty
  useEffect(() => {
    if (!search.trim()) {
      setFtsSearchIds(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .searchContacts(search.trim())
        .then((ids) => setFtsSearchIds(new Set(ids)))
        .catch(() => setFtsSearchIds(new Set()));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const contactsList = Array.isArray(contacts) ? contacts : [];

  // E1.2: AND/OR filtre birleştirme + city
  const cityLower = cityFilter.trim().toLowerCase();
  const nextWeekMon = (() => {
    const now = new Date();
    const mon = new Date(now);
    mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
    mon.setHours(0, 0, 0, 0);
    return mon;
  })();
  const nextWeekSun = new Date(nextWeekMon);
  nextWeekSun.setDate(nextWeekMon.getDate() + 6);
  nextWeekSun.setHours(23, 59, 59, 999);
  const cutoff30 = Date.now() - 30 * 24 * 60 * 60 * 1000;

  let filtered: typeof contactsList;
  if (filterMode === "or") {
    const anyIds = new Set<string>();
    if (search.trim() && ftsSearchIds) ftsSearchIds.forEach((id) => anyIds.add(id));
    else if (search.trim())
      contactsList.forEach((c) => {
        if (
          `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
          (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(search.toLowerCase())
        )
          anyIds.add(c.id);
      });
    if (fieldFilterIds) fieldFilterIds.forEach((id) => anyIds.add(id));
    if (hashtagFilterIds) hashtagFilterIds.forEach((id) => anyIds.add(id));
    if (touchFilter === "next_this_week")
      contactsList.forEach((c) => {
        const nt = c.next_touch_at ? new Date(c.next_touch_at) : null;
        if (nt != null && nt >= nextWeekMon && nt <= nextWeekSun) anyIds.add(c.id);
      });
    if (touchFilter === "last_30_plus")
      contactsList.forEach((c) => {
        const lt = c.last_touched_at ? new Date(c.last_touched_at).getTime() : 0;
        if (lt === 0 || lt <= cutoff30) anyIds.add(c.id);
      });
    if (cityLower)
      contactsList.forEach((c) => {
        if ((c.city ?? "").toLowerCase().includes(cityLower)) anyIds.add(c.id);
      });
    if (
      !search.trim() &&
      !fieldFilterIds?.size &&
      !hashtagFilterIds?.size &&
      !touchFilter &&
      !cityLower
    )
      filtered = contactsList;
    else filtered = contactsList.filter((c) => anyIds.has(c.id));
  } else {
    filtered = contactsList;
    if (search.trim()) {
      if (ftsSearchIds) filtered = filtered.filter((c) => ftsSearchIds!.has(c.id));
      else
        filtered = filtered.filter(
          (c) =>
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
            (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
            (c.email ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }
    if (fieldFilterIds) filtered = filtered.filter((c) => fieldFilterIds.has(c.id));
    if (hashtagFilterIds) filtered = filtered.filter((c) => hashtagFilterIds.has(c.id));
    if (touchFilter === "next_this_week")
      filtered = filtered.filter((c) => {
        const nt = c.next_touch_at ? new Date(c.next_touch_at) : null;
        return nt != null && nt >= nextWeekMon && nt <= nextWeekSun;
      });
    if (touchFilter === "last_30_plus")
      filtered = filtered.filter((c) => {
        const lt = c.last_touched_at ? new Date(c.last_touched_at).getTime() : 0;
        return lt === 0 || lt <= cutoff30;
      });
    if (cityLower)
      filtered = filtered.filter((c) => (c.city ?? "").toLowerCase().includes(cityLower));
  }

  const applySavedView = (v: SavedView) => {
    setSearch(v.filters.search);
    setTouchFilter(v.filters.touchFilter);
    setFieldFilterId(v.filters.fieldFilterId);
    setFieldFilterValue(v.filters.fieldFilterValue);
    setCityFilter(v.filters.city);
    setFilterMode(v.filters.filterMode);
    if (v.filters.hashtag)
      setSearchParams({ hashtag: v.filters.hashtag });
    else
      setSearchParams({});
    setShowSavedViews(false);
  };

  const saveCurrentView = () => {
    const name = saveViewName.trim() || "Görünüm";
    saveSavedView(name, {
      search,
      touchFilter,
      fieldFilterId,
      fieldFilterValue,
      hashtag: hashtagParam ?? "",
      city: cityFilter,
      filterMode,
    });
    setSavedViews(getSavedViews());
    setSaveViewName("");
    setShowSavedViews(false);
  };

  const removeSavedView = (id: string) => {
    deleteSavedView(id);
    setSavedViews(getSavedViews());
  };

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
            placeholder="E1.1 FTS: isim, not, şirket…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value as "and" | "or")}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          title="E1.2 AND/OR"
        >
          <option value="and">Tümü (AND)</option>
          <option value="or">Herhangi (OR)</option>
        </select>
        <Input
          placeholder="Şehir (E1.2)"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-10 w-32"
        />
        <div className="relative" ref={savedViewsRef}>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={(e) => {
              e.stopPropagation();
              setShowSavedViews((s) => !s);
            }}
          >
            <Bookmark className="mr-1 h-4 w-4" />
            Kayıtlı görünüm (E1.3)
          </Button>
          {showSavedViews && (
            <div className="absolute left-0 top-full z-10 mt-1 w-56 rounded-md border bg-background p-2 shadow-lg">
              <div className="mb-2 flex gap-1">
                <input
                  type="text"
                  placeholder="Görünüm adı"
                  value={saveViewName}
                  onChange={(e) => setSaveViewName(e.target.value)}
                  className="h-8 flex-1 rounded border border-input bg-background px-2 text-sm"
                />
                <Button variant="outline" size="sm" onClick={saveCurrentView}>
                  Kaydet
                </Button>
              </div>
              {savedViews.length === 0 ? (
                <p className="text-xs text-muted-foreground">Kayıtlı görünüm yok.</p>
              ) : (
                <ul className="space-y-1">
                  {savedViews.map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-1 rounded px-2 py-1 hover:bg-muted">
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left text-sm"
                        onClick={() => applySavedView(v)}
                      >
                        {v.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeSavedView(v.id)}
                        title="Sil"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
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
