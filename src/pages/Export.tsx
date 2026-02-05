import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { save } from "@tauri-apps/plugin-dialog";
import { api, type Contact } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Download, FileJson, FileSpreadsheet } from "lucide-react";

const CSV_FIELDS: { key: keyof Contact; label: string }[] = [
  { key: "first_name", label: "Ad" },
  { key: "last_name", label: "Soyad" },
  { key: "title", label: "Ünvan" },
  { key: "company", label: "Şirket" },
  { key: "city", label: "Şehir" },
  { key: "country", label: "Ülke" },
  { key: "email", label: "E-posta" },
  { key: "email_secondary", label: "E-posta (ikincil)" },
  { key: "phone", label: "Telefon" },
  { key: "phone_secondary", label: "Telefon (ikincil)" },
  { key: "linkedin_url", label: "LinkedIn" },
  { key: "twitter_url", label: "Twitter" },
  { key: "website", label: "Web sitesi" },
  { key: "notes", label: "Notlar" },
  { key: "last_touched_at", label: "Son temas" },
  { key: "next_touch_at", label: "Sonraki temas" },
  { key: "created_at", label: "Oluşturulma" },
  { key: "updated_at", label: "Güncellenme" },
];

const DEFAULT_CSV_KEYS: (keyof Contact)[] = [
  "first_name",
  "last_name",
  "title",
  "company",
  "city",
  "country",
  "email",
  "phone",
  "notes",
];

function buildCsvUtf8(contacts: Contact[], selectedKeys: (keyof Contact)[]): string {
  const rows = contacts.map((c) => {
    const row: Record<string, string> = {};
    for (const k of selectedKeys) {
      const v = c[k];
      row[k] = v != null ? String(v) : "";
    }
    return row;
  });
  const csv = Papa.unparse(rows, { header: true });
  return "\uFEFF" + csv;
}

function buildJson(contacts: Contact[]): string {
  return JSON.stringify(contacts, null, 2);
}

export function Export() {
  const location = useLocation();
  const navigate = useNavigate();
  const passedContacts = (location.state as { contacts?: Contact[] } | null)?.contacts;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvSelected, setCsvSelected] = useState<Set<keyof Contact>>(
    () => new Set(DEFAULT_CSV_KEYS)
  );
  const [exporting, setExporting] = useState<"csv" | "json" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isFromContacts = passedContacts != null && passedContacts.length >= 0;

  useEffect(() => {
    if (passedContacts != null) {
      setContacts(passedContacts);
      setLoading(false);
      return;
    }
    api
      .contactList()
      .then((list) => setContacts(Array.isArray(list) ? list : []))
      .catch(() => setContacts([]))
      .finally(() => setLoading(false));
  }, [passedContacts]);

  const toggleCsvField = (key: keyof Contact) => {
    setCsvSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectAllCsv = () => setCsvSelected(new Set(CSV_FIELDS.map((f) => f.key)));
  const clearAllCsv = () => setCsvSelected(new Set());

  const runExportCsv = async () => {
    if (contacts.length === 0) {
      setError("Dışa aktarılacak kişi yok.");
      return;
    }
    const keys = Array.from(csvSelected);
    if (keys.length === 0) {
      setError("En az bir CSV alanı seçin.");
      return;
    }
    setError(null);
    setExporting("csv");
    try {
      const path = await save({
        defaultPath: `vaultcrm-contacts-${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (path) {
        const content = buildCsvUtf8(contacts, keys);
        await api.writeExportFile(path, content);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(null);
    }
  };

  const runExportJson = async () => {
    if (contacts.length === 0) {
      setError("Dışa aktarılacak kişi yok.");
      return;
    }
    setError(null);
    setExporting("json");
    try {
      const path = await save({
        defaultPath: `vaultcrm-contacts-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (path) {
        const content = buildJson(contacts);
        await api.writeExportFile(path, content);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setExporting(null);
    }
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
      <h1 className="mb-6 text-2xl font-semibold">Dışa aktar (Export)</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Dosya, bilgisayarınızda seçtiğiniz konuma kaydedilir; veri sunucuya gönderilmez (E3.3).
      </p>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="font-medium">Kapsam:</span>
        {isFromContacts ? (
          <span>
            Kişiler sayfasındaki filtreye göre <strong>{contacts.length}</strong> kişi
          </span>
        ) : (
          <span>
            Tüm kişiler: <strong>{contacts.length}</strong> kişi
          </span>
        )}
      </div>
      {!isFromContacts && (
        <p className="mb-6 text-sm text-muted-foreground">
          Kişiler sayfasında filtre uygulayıp &quot;Dışa aktar&quot; ile sadece o listeyi
          dışa aktarabilirsiniz.
        </p>
      )}

      {error && (
        <p className="mb-4 rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSpreadsheet className="h-4 w-4" />
              CSV (E3.1)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Seçilen alanlar, UTF-8. Excel’de doğru açılır.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllCsv}>
                Tümünü seç
              </Button>
              <Button variant="outline" size="sm" onClick={clearAllCsv}>
                Temizle
              </Button>
            </div>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded border p-2">
              {CSV_FIELDS.map(({ key, label }) => (
                <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={csvSelected.has(key)}
                    onChange={() => toggleCsvField(key)}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            <Button
              onClick={runExportCsv}
              disabled={exporting !== null || csvSelected.size === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "csv" ? "Kaydediliyor…" : "CSV indir"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileJson className="h-4 w-4" />
              JSON (E3.2)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tam veri seti; yedek veya taşıma için.
            </p>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runExportJson}
              disabled={exporting !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting === "json" ? "Kaydediliyor…" : "JSON indir"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {isFromContacts && (
        <div className="mt-6">
          <Button variant="outline" onClick={() => navigate("/contacts")}>
            Kişilere dön
          </Button>
        </div>
      )}
    </div>
  );
}
