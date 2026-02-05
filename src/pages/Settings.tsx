import { useEffect, useState } from "react";
import { api, type CustomField } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Shield } from "lucide-react";
import {
  getHealthThresholds,
  setHealthThresholds,
  type HealthThresholds,
} from "@/lib/relationshipHealth";
import { getCrashReportOptIn, setCrashReportOptIn } from "@/lib/privacy";

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
  const [attachmentsDir, setAttachmentsDir] = useState("");
  const [attachmentsSaving, setAttachmentsSaving] = useState(false);
  const [attachmentsError, setAttachmentsError] = useState<string | null>(null);
  const [healthThresholds, setHealthThresholdsState] = useState<HealthThresholds>(getHealthThresholds());
  const [healthThresholdsSaving, setHealthThresholdsSaving] = useState(false);
  const [crashReportOptIn, setCrashReportOptInState] = useState(getCrashReportOptIn());

  useEffect(() => {
    setHealthThresholdsState(getHealthThresholds());
  }, []);

  useEffect(() => {
    Promise.all([api.customFieldList(), api.attachmentsDirGet()])
      .then(([fields, dir]) => {
        setCustomFields(fields);
        setAttachmentsDir(dir);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
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

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Gizlilik (F2)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Telemetri kapalı. Hiçbir kullanım verisi gönderilmez (F2.2).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={crashReportOptIn}
              onChange={(e) => {
                const v = e.target.checked;
                setCrashReportOptInState(v);
                setCrashReportOptIn(v);
              }}
              className="rounded"
            />
            <span>Crash raporu (isteğe bağlı, anonim) — F2.3</span>
          </label>
          <p className="text-xs text-muted-foreground">
            Açıldığında uygulama çöktüğünde anonim crash log gönderilebilir. Varsayılan: kapalı.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Attachment klasörü (A6)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Depolama yolu</Label>
            <Input
              value={attachmentsDir}
              onChange={(e) => setAttachmentsDir(e.target.value)}
              placeholder="C:\\Users\\...\\VaultCRM\\attachments"
            />
            <p className="text-xs text-muted-foreground">
              Boş bırakmayın. Varsayılan uygulama veri klasörüdür.
            </p>
          </div>
          {attachmentsError && (
            <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {attachmentsError}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={attachmentsSaving || !attachmentsDir.trim()}
            onClick={() => {
              setAttachmentsSaving(true);
              setAttachmentsError(null);
              api
                .attachmentsDirSet(attachmentsDir.trim())
                .catch((e) => setAttachmentsError(String(e)))
                .finally(() => setAttachmentsSaving(false));
            }}
          >
            {attachmentsSaving ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">İlişki sağlığı eşikleri (B3)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Warm / Cooling / Cold göstergesi recency (son temas) ve frequency (son N ayda temas sayısı) ile hesaplanır.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Warm: son X gün içinde</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={healthThresholds.warmDays}
                onChange={(e) =>
                  setHealthThresholdsState((t) => ({
                    ...t,
                    warmDays: Math.max(1, Math.min(365, Number(e.target.value) || 30)),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cooling: son Y gün içinde</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={healthThresholds.coolingDays}
                onChange={(e) =>
                  setHealthThresholdsState((t) => ({
                    ...t,
                    coolingDays: Math.max(1, Math.min(365, Number(e.target.value) || 90)),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency: son Z ay</Label>
              <Input
                type="number"
                min={1}
                max={24}
                value={healthThresholds.frequencyMonths}
                onChange={(e) =>
                  setHealthThresholdsState((t) => ({
                    ...t,
                    frequencyMonths: Math.max(1, Math.min(24, Number(e.target.value) || 6)),
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Warm için en az temas sayısı</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={healthThresholds.minFrequencyForWarm}
                onChange={(e) =>
                  setHealthThresholdsState((t) => ({
                    ...t,
                    minFrequencyForWarm: Math.max(0, Math.min(100, Number(e.target.value) || 1)),
                  }))
                }
              />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={healthThresholdsSaving}
            onClick={() => {
              setHealthThresholdsSaving(true);
              setHealthThresholds(healthThresholds);
              setHealthThresholdsSaving(false);
            }}
          >
            {healthThresholdsSaving ? "Kaydediliyor…" : "Eşikleri kaydet"}
          </Button>
        </CardContent>
      </Card>

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
