import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Company } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DomainAvatar } from "@/components/DomainAvatar";

export function Companies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newIndustry, setNewIndustry] = useState("");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    api.companyList().then(setCompanies).catch(console.error).finally(() => setLoading(false));
  }, []);

  const addCompany = () => {
    if (!newName.trim()) return;
    api
      .companyCreate({
        name: newName.trim(),
        domain: newDomain.trim() || null,
        industry: newIndustry.trim() || null,
        notes: newNotes.trim() || null,
      })
      .then(() => {
        setNewName("");
        setNewDomain("");
        setNewIndustry("");
        setNewNotes("");
        setShowAdd(false);
        api.companyList().then(setCompanies).catch(console.error);
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
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Şirketler</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <Plus className="mr-2 h-4 w-4" />
          Şirket ekle
        </Button>
      </div>

      {showAdd && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Yeni şirket (A2)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Input
                placeholder="Şirket adı *"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-64"
              />
              <Input
                placeholder="Domain (örn. company.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-64"
              />
              <Input
                placeholder="Sektör"
                value={newIndustry}
                onChange={(e) => setNewIndustry(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="space-y-2">
              <Label>Notlar (Markdown)</Label>
              <Textarea
                placeholder="Şirket notları…"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addCompany} disabled={!newName.trim()}>
                Kaydet
              </Button>
              <Button variant="ghost" onClick={() => setShowAdd(false)}>
                İptal
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{companies.length} şirket</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {companies.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <DomainAvatar domain={c.domain} size="sm" />
                  <Link
                    to={`/companies/${c.id}`}
                    className="font-medium hover:underline"
                  >
                    {c.name}
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {c.domain && <span>{c.domain}</span>}
                  {c.industry && <span>· {c.industry}</span>}
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/companies/${c.id}`}>Aç</Link>
                </Button>
              </li>
            ))}
          </ul>
          {companies.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              Henüz şirket yok. Kişi eklerken şirket seçebilir veya buradan şirket ekleyebilirsin.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
