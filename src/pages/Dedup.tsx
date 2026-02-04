import { useEffect, useMemo, useState } from "react";
import { api, type Contact, type DedupCandidate, type CustomValue, type MergeContactInput } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const CONTACT_FIELDS: Array<{ key: keyof Contact; label: string }> = [
  { key: "first_name", label: "Ad" },
  { key: "last_name", label: "Soyad" },
  { key: "title", label: "Unvan / Rol" },
  { key: "company", label: "Şirket (metin)" },
  { key: "company_id", label: "Şirket ID" },
  { key: "city", label: "Şehir" },
  { key: "country", label: "Ülke" },
  { key: "email", label: "Email (birincil)" },
  { key: "email_secondary", label: "Email (ek)" },
  { key: "phone", label: "Telefon (birincil)" },
  { key: "phone_secondary", label: "Telefon (ek)" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "twitter_url", label: "Twitter / X" },
  { key: "website", label: "Web sitesi" },
  { key: "notes", label: "Notlar" },
];

function displayValue(v: string | null | undefined) {
  const s = (v ?? "").trim();
  return s ? s : "—";
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

function reasonLabel(r: string) {
  if (r === "email") return "Email eşleşmesi";
  if (r === "phone") return "Telefon eşleşmesi";
  if (r === "name") return "İsim benzerliği";
  return r;
}

export function Dedup() {
  const [candidates, setCandidates] = useState<DedupCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DedupCandidate | null>(null);
  const [keep, setKeep] = useState<"a" | "b">("a");
  const [fieldChoice, setFieldChoice] = useState<Record<string, "a" | "b">>({});
  const [customChoice, setCustomChoice] = useState<Record<string, "a" | "b">>({});
  const [customA, setCustomA] = useState<CustomValue[]>([]);
  const [customB, setCustomB] = useState<CustomValue[]>([]);
  const [merging, setMerging] = useState(false);

  const load = () => {
    setLoading(true);
    api
      .dedupCandidates()
      .then(setCandidates)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const selectCandidate = (c: DedupCandidate) => {
    setSelected(c);
    setKeep("a");
    const initial: Record<string, "a" | "b"> = {};
    CONTACT_FIELDS.forEach(({ key }) => {
      const aVal = String((c.a as Record<string, string | null>)[key] ?? "").trim();
      const bVal = String((c.b as Record<string, string | null>)[key] ?? "").trim();
      initial[key] = aVal ? "a" : bVal ? "b" : "a";
    });
    setFieldChoice(initial);
    Promise.all([api.contactCustomValuesGet(c.a.id), api.contactCustomValuesGet(c.b.id)])
      .then(([aVals, bVals]) => {
        setCustomA(aVals ?? []);
        setCustomB(bVals ?? []);
        const byField: Record<string, "a" | "b"> = {};
        (aVals ?? []).forEach((v) => {
          const b = (bVals ?? []).find((x) => x.field_id === v.field_id);
          const aVal = (v.value ?? "").trim();
          const bVal = (b?.value ?? "").trim();
          byField[v.field_id] = aVal ? "a" : bVal ? "b" : "a";
        });
        setCustomChoice(byField);
      })
      .catch(console.error);
  };

  const customMerged = useMemo(() => {
    const map = new Map<string, { field_name: string; kind: string; a?: string | null; b?: string | null }>();
    customA.forEach((v) => {
      map.set(v.field_id, {
        field_name: v.field_name,
        kind: v.kind,
        a: v.value ?? null,
        b: map.get(v.field_id)?.b ?? null,
      });
    });
    customB.forEach((v) => {
      map.set(v.field_id, {
        field_name: v.field_name,
        kind: v.kind,
        a: map.get(v.field_id)?.a ?? null,
        b: v.value ?? null,
      });
    });
    return map;
  }, [customA, customB]);

  const runMerge = () => {
    if (!selected) return;
    const primary = keep === "a" ? selected.a : selected.b;
    const secondary = keep === "a" ? selected.b : selected.a;
    const pick = (key: keyof Contact) => {
      const source = fieldChoice[key] === "b" ? selected.b : selected.a;
      return (source as Record<string, string | null | undefined>)[key] ?? null;
    };
    const toMaybe = (value: string | null | undefined) => {
      const v = String(value ?? "").trim();
      return v ? v : null;
    };
    const merged: MergeContactInput["merged"] = {
      first_name: String(pick("first_name") ?? "").trim(),
      last_name: String(pick("last_name") ?? "").trim(),
      title: toMaybe(pick("title")),
      company: toMaybe(pick("company")),
      company_id: toMaybe(pick("company_id")),
      city: toMaybe(pick("city")),
      country: toMaybe(pick("country")),
      email: toMaybe(pick("email")),
      email_secondary: toMaybe(pick("email_secondary")),
      phone: toMaybe(pick("phone")),
      phone_secondary: toMaybe(pick("phone_secondary")),
      linkedin_url: toMaybe(pick("linkedin_url")),
      twitter_url: toMaybe(pick("twitter_url")),
      website: toMaybe(pick("website")),
      notes: toMaybe(pick("notes")),
    };

    const custom_values = Array.from(customMerged.entries()).map(([field_id, v]) => {
      const choice = customChoice[field_id] ?? "a";
      const value = choice === "b" ? v.b : v.a;
      return { field_id, value: value ?? null };
    });

    setMerging(true);
    api
      .contactMerge({
        primary_id: primary.id,
        secondary_id: secondary.id,
        merged,
        custom_values,
      })
      .then(() => {
        setSelected(null);
        setCustomA([]);
        setCustomB([]);
        setFieldChoice({});
        setCustomChoice({});
        load();
      })
      .catch(console.error)
      .finally(() => setMerging(false));
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">Olası duplikatlar (A5)</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">{candidates.length} aday</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length === 0 && (
            <p className="text-sm text-muted-foreground">Şimdilik eşleşme bulunamadı.</p>
          )}
          <ul className="space-y-3">
            {candidates.map((c, idx) => (
              <li key={`${c.a.id}-${c.b.id}-${idx}`} className="rounded border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">
                      {c.a.first_name} {c.a.last_name} ↔ {c.b.first_name} {c.b.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[c.a.email, c.a.phone, c.a.company].filter(Boolean).join(" · ") || "—"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {[c.b.email, c.b.phone, c.b.company].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-wrap gap-1 text-xs">
                      {c.reasons.map((r) => (
                        <span key={r} className="rounded bg-muted px-2 py-1 text-muted-foreground">
                          {reasonLabel(r)}
                        </span>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => selectCandidate(c)}>
                      Birleştir
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Birleştirme seçimi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="space-y-2">
                <Label>Kayıt</Label>
                <div className="space-y-1">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={keep === "a"}
                      onChange={() => setKeep("a")}
                    />
                    {selected.a.first_name} {selected.a.last_name} (A)
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={keep === "b"}
                      onChange={() => setKeep("b")}
                    />
                    {selected.b.first_name} {selected.b.last_name} (B)
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Alan seçimi</Label>
              {CONTACT_FIELDS.map(({ key, label }) => (
                <div key={key} className="grid grid-cols-3 items-start gap-2 text-sm">
                  <div className="text-muted-foreground">{label}</div>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={fieldChoice[key] === "a"}
                      onChange={() => setFieldChoice((f) => ({ ...f, [key]: "a" }))}
                    />
                    <span>{displayValue((selected.a as Record<string, string | null>)[key])}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={fieldChoice[key] === "b"}
                      onChange={() => setFieldChoice((f) => ({ ...f, [key]: "b" }))}
                    />
                    <span>{displayValue((selected.b as Record<string, string | null>)[key])}</span>
                  </label>
                </div>
              ))}
            </div>

            {customMerged.size > 0 && (
              <div className="space-y-3">
                <Label>Özel alanlar</Label>
                {Array.from(customMerged.entries()).map(([field_id, v]) => {
                  const aVal = v.kind === "multi_select" ? parseMultiValue(v.a).join(", ") : v.a;
                  const bVal = v.kind === "multi_select" ? parseMultiValue(v.b).join(", ") : v.b;
                  return (
                    <div key={field_id} className="grid grid-cols-3 items-start gap-2 text-sm">
                      <div className="text-muted-foreground">{v.field_name}</div>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={customChoice[field_id] === "a"}
                          onChange={() => setCustomChoice((c) => ({ ...c, [field_id]: "a" }))}
                        />
                        <span>{displayValue(aVal)}</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={customChoice[field_id] === "b"}
                          onChange={() => setCustomChoice((c) => ({ ...c, [field_id]: "b" }))}
                        />
                        <span>{displayValue(bVal)}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={runMerge} disabled={merging}>
                {merging ? "Birleştiriliyor…" : "Birleştir"}
              </Button>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Vazgeç
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
