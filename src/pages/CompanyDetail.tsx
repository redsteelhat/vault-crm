import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, type Company, type Contact, type Attachment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Pencil, Save, X, User } from "lucide-react";
import { DomainAvatar } from "@/components/DomainAvatar";
import { MarkdownView } from "@/components/MarkdownView";
import { open } from "@tauri-apps/plugin-shell";

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", industry: "", notes: "" });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [attachUploading, setAttachUploading] = useState(false);
  const [notesPreview, setNotesPreview] = useState(false);

  const load = () => {
    const rawId = id?.trim();
    if (!rawId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([api.companyGet(rawId), api.contactListByCompany(rawId), api.attachmentList("company", rawId)])
      .then(([c, list, at]) => {
        try {
          setCompany(c ?? null);
          setContacts(Array.isArray(list) ? list : []);
          setAttachments(Array.isArray(at) ? at : []);
          if (c && typeof c === "object") {
            setForm({
              name: c.name ?? "",
              domain: c.domain ?? "",
              industry: c.industry ?? "",
              notes: c.notes ?? "",
            });
          }
        } catch (e) {
          console.error(e);
          setCompany(null);
        }
      })
      .catch((e) => {
        console.error(e);
        setCompany(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveCompany = () => {
    if (!id) return;
    api
      .companyUpdate(id, {
        name: form.name.trim(),
        domain: form.domain.trim() || null,
        industry: form.industry.trim() || null,
        notes: form.notes.trim() || null,
      })
      .then(() => {
        setEditing(false);
        load();
      })
      .catch(console.error);
  };

  const addAttachment = async () => {
    if (!id || !attachFile) return;
    setAttachUploading(true);
    setAttachError(null);
    try {
      const buffer = await attachFile.arrayBuffer();
      const bytes = Array.from(new Uint8Array(buffer));
      await api.attachmentAdd({
        owner_type: "company",
        owner_id: id,
        file_name: attachFile.name,
        mime: attachFile.type || null,
        bytes,
      });
      setAttachFile(null);
      load();
    } catch (e) {
      setAttachError(String(e));
    } finally {
      setAttachUploading(false);
    }
  };

  const openAttachment = (att: Attachment) => {
    api
      .attachmentOpen(att.id)
      .then((path) => open(path))
      .catch(console.error);
  };

  const deleteAttachment = (att: Attachment) => {
    api.attachmentDelete(att.id).then(load).catch(console.error);
  };

  if (loading || !company) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            {loading ? "Yükleniyor…" : id ? "Şirket bulunamadı." : "Geçersiz bağlantı."}
          </p>
          {!loading && (
            <Button variant="outline" className="mt-4" onClick={() => navigate("/companies")}>
              Şirketler listesine dön
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/companies")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <DomainAvatar domain={company.domain} size="lg" />
          <h1 className="text-2xl font-semibold">{company.name}</h1>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Düzenle
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              <X className="mr-2 h-4 w-4" />
              İptal
            </Button>
            <Button size="sm" onClick={saveCompany}>
              <Save className="mr-2 h-4 w-4" />
              Kaydet
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Şirket kartı (A2)</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>İsim</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Şirket adı"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Input
                    value={form.domain}
                    onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
                    placeholder="company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sektör / Industry</Label>
                  <Input
                    value={form.industry}
                    onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                    placeholder="Örn. Fintech, SaaS"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label>Notlar (Markdown)</Label>
                    <Button
                      type="button"
                      variant={notesPreview ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => setNotesPreview((p) => !p)}
                    >
                      {notesPreview ? "Düzenle" : "Önizleme"}
                    </Button>
                  </div>
                  {notesPreview ? (
                    <div className="rounded border border-input bg-muted/30 p-3 min-h-[80px]">
                      <MarkdownView source={form.notes} />
                    </div>
                  ) : (
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Şirket notları…"
                      rows={3}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                {company.domain && <p>Domain: {company.domain}</p>}
                {company.industry && <p>Sektör: {company.industry}</p>}
                {company.notes && (
                  <div className="mt-2 rounded border p-2 text-muted-foreground">
                    <MarkdownView source={company.notes} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="h-4 w-4" />
            <CardTitle className="text-base">Bu şirkete bağlı kişiler (A2.3)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="font-medium">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.title && <span className="text-sm text-muted-foreground">{c.title}</span>}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/contacts/${c.id}`}>Kişiye git</Link>
                  </Button>
                </li>
              ))}
            </ul>
            {contacts.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Bu şirkete bağlı kişi yok. Kişi kartında şirket olarak bu şirketi seçebilirsin.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Ek dosyalar (A6)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {attachError && (
            <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {attachError}
            </p>
          )}
          <Button onClick={addAttachment} disabled={!attachFile || attachUploading}>
            {attachUploading ? "Yükleniyor…" : "Ekle"}
          </Button>
          <ul className="divide-y">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{a.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.size != null ? `${(a.size / 1024).toFixed(1)} KB` : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openAttachment(a)}>
                    Aç
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteAttachment(a)}>
                    Sil
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {attachments.length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz ek dosya yok.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
