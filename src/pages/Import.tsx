import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { api, type ImportRow } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

// LinkedIn "Connections" CSV often has: First Name, Last Name, Email Address, Company, Position, Connected On
// We map common column names to our fields.
const LINKEDIN_MAP: Record<string, keyof ImportRow> = {
  "First Name": "first_name",
  "First name": "first_name",
  "Last Name": "last_name",
  "Last name": "last_name",
  "Email Address": "email",
  "Email": "email",
  "Company": "company",
  "Position": "title",
  "Connected On": undefined as unknown as keyof ImportRow,
};
const GENERIC_MAP: Record<string, keyof ImportRow> = {
  first_name: "first_name",
  firstname: "first_name",
  last_name: "last_name",
  lastname: "last_name",
  email: "email",
  company: "company",
  title: "title",
  city: "city",
  country: "country",
  phone: "phone",
  linkedin: "linkedin_url",
  linkedin_url: "linkedin_url",
  website: "website",
};

function mapRow(cols: Record<string, string>, headers: string[]): ImportRow {
  const row: ImportRow = {};
  const lower: Record<string, string> = {};
  headers.forEach((h) => {
    lower[h.toLowerCase().trim()] = h;
  });
  for (const [header, value] of Object.entries(cols)) {
    const key =
      LINKEDIN_MAP[header] ??
      GENERIC_MAP[header.toLowerCase().trim()] ??
      GENERIC_MAP[header.replace(/\s/g, "_").toLowerCase()];
    if (key && value != null && String(value).trim() !== "") {
      (row as Record<string, string | null>)[key] = String(value).trim();
    }
  }
  return row;
}

export function Import() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const [dedupCount, setDedupCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setError(null);
    setDone(null);
    setDedupCount(null);
    if (!f) {
      setFile(null);
      setPreview([]);
      return;
    }
    setFile(f);
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const rows: ImportRow[] = (res.data as Record<string, string>[]).map(
          (r) => mapRow(r, headers)
        );
        setPreview(rows.slice(0, 10));
      },
      error: (err) => setError(err.message),
    });
  }, []);

  const runImport = () => {
    if (!file || preview.length === 0) return;
    setError(null);
    setImporting(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        const rows: ImportRow[] = (res.data as Record<string, string>[]).map(
          (r) => mapRow(r, headers)
        );
        api
          .importContacts(rows)
          .then((count) => {
            setDone(count);
            setFile(null);
            setPreview([]);
            return api.dedupCandidates();
          })
          .then((candidates) => {
            setDedupCount(candidates.length);
          })
          .catch((e) => setError(String(e)))
          .finally(() => setImporting(false));
      },
      error: (err) => {
        setError(err.message);
        setImporting(false);
      },
    });
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-semibold">CSV Import</h1>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            LinkedIn Connections veya genel CSV
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            LinkedIn’den “Verilerinizin bir kopyasını alın” ile indirdiğiniz
            Connections.csv veya benzeri CSV’yi seçin. Sütunlar otomatik eşlenir
            (First Name, Last Name, Email, Company, Position).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="csv">Dosya seç</Label>
            <input
              id="csv"
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="mt-2 block w-full text-sm"
            />
          </div>
          {error && (
            <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}
          {done !== null && (
            <p className="text-sm text-green-600">
              {done} kişi içe aktarıldı.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => navigate("/contacts")}>
                Kişilere git →
              </Button>
            </p>
          )}
          {dedupCount !== null && dedupCount > 0 && (
            <p className="text-sm text-muted-foreground">
              {dedupCount} olası tekrar bulundu.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => navigate("/dedup")}>
                Duplikatlara git →
              </Button>
            </p>
          )}
          {preview.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                Önizleme (ilk 10): {preview.map((r) => `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim()).filter(Boolean).join(", ") || "—"}
              </p>
              <Button
                onClick={runImport}
                disabled={importing}
              >
                {importing ? "İçe aktarılıyor…" : "İçe aktar"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
