import { useEffect, useState } from "react";
import { api, type CustomField } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

const FIELD_KINDS = [
  { value: "text", label: "Metin" },
  { value: "number", label: "Sayı" },
  { value: "date", label: "Tarih" },
  { value: "single_select", label: "Tek seçim" },
  { value: "multi_select", label: "Çoklu seçim" },
];

export function Settings() {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("text");
  const [newOptions, setNewOptions] = useState("");

  useEffect(() => {
    api.customFieldList().then(setCustomFields).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addField = () => {
    if (!newName.trim()) return;
    const options = newKind === "single_select" || newKind === "multi_select"
      ? newOptions.trim()
        ? JSON.stringify(newOptions.split(",").map((s) => s.trim()).filter(Boolean))
        : null
      : null;
    api
      .customFieldCreate({
        name: newName.trim(),
        kind: newKind,
        options,
      })
      .then(() => {
        setNewName("");
        setNewKind("text");
        setNewOptions("");
        setShowAdd(false);
        api.customFieldList().then(setCustomFields).catch(console.error);
      })
      .catch(console.error);
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
      <h1 className="mb-6 text-2xl font-semibold">Ayarlar</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Özel alanlar (A3)</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni alan
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {showAdd && (
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <div className="space-y-2">
                <Label>Alan adı</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Örn. Warmth score, Source"
                />
              </div>
              <div className="space-y-2">
                <Label>Tip</Label>
                <select
                  value={newKind}
                  onChange={(e) => setNewKind(e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {FIELD_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>{k.label}</option>
                  ))}
                </select>
              </div>
              {(newKind === "single_select" || newKind === "multi_select") && (
                <div className="space-y-2">
                  <Label>Seçenekler (virgülle ayır)</Label>
                  <Input
                    value={newOptions}
                    onChange={(e) => setNewOptions(e.target.value)}
                    placeholder="Örn: Hot, Warm, Cold"
                  />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={addField} disabled={!newName.trim()}>
                  Ekle
                </Button>
                <Button variant="ghost" onClick={() => setShowAdd(false)}>
                  İptal
                </Button>
              </div>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Varsayılan şablon: Warmth score (1–5), Source, Stage. Kişi kartında özel alanları düzenleyebilirsin.
          </p>
          <ul className="divide-y text-sm">
            {customFields.map((f) => (
              <li key={f.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span>
                  <strong>{f.name}</strong>
                  <span className="ml-2 text-muted-foreground">({f.kind})</span>
                </span>
              </li>
            ))}
          </ul>
          {customFields.length === 0 && !showAdd && (
            <p className="py-4 text-center text-muted-foreground">
              Henüz özel alan yok. Veritabanı ilk açılışta Warmth score, Source, Stage ekler.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
