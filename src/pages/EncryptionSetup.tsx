import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, AlertTriangle, FolderOpen } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";

type SetupReason = "first_run" | "migrate_plain";

const RECOVERY_WARNING =
  "Anahtarı veya passphrase'ı unutursanız verilerinize tekrar erişemezsiniz. " +
  "Düzenli yedek (Export) almanızı öneririz.";

export function EncryptionSetup({
  reason,
  onComplete,
}: {
  reason: SetupReason;
  onComplete: () => void;
}) {
  const [usePassphrase, setUsePassphrase] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [openFromSync, setOpenFromSync] = useState(false);
  const [syncFolderPath, setSyncFolderPath] = useState("");
  const [syncPassphrase, setSyncPassphrase] = useState("");

  const isFirstRun = reason === "first_run";

  const submit = async () => {
    setError(null);
    if (openFromSync) {
      if (!syncFolderPath.trim()) {
        setError("Sync klasörü seçin.");
        return;
      }
      if (syncPassphrase.length < 8) {
        setError("Passphrase en az 8 karakter olmalı (diğer cihazdaki ile aynı).");
        return;
      }
      setLoading(true);
      try {
        await api.openFromSyncFolder(syncFolderPath.trim(), syncPassphrase);
        await api.encryptionSetupOpenDb();
        onComplete();
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
      return;
    }
    if (usePassphrase) {
      if (passphrase.length < 8) {
        setError("Passphrase en az 8 karakter olmalı.");
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setError("Passphrase eşleşmiyor.");
        return;
      }
    }
    setLoading(true);
    try {
      const p = usePassphrase ? passphrase : null;
      if (isFirstRun) {
        await api.encryptionSetupCreateKey(p);
      } else {
        await api.encryptionMigratePlainDb(p);
      }
      await api.encryptionSetupOpenDb();
      onComplete();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <KeyRound className="h-6 w-6" />
            {isFirstRun ? "Şifreleme anahtarını oluştur" : "Mevcut veriyi şifrele"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isFirstRun
              ? "Veritabanı şifreli saklanacak; anahtar işletim sisteminizin güvenli deposunda tutulur (F1.2)."
              : "Mevcut vault.db şifrelenecek; anahtar keychain’e kaydedilir."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>{RECOVERY_WARNING}</span>
            </div>
          </div>

          {isFirstRun && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <input type="radio" checked={!openFromSync} onChange={() => setOpenFromSync(false)} className="rounded" />
                Yeni oluştur (bu cihazda sıfırdan başla)
              </Label>
              <Label className="flex items-center gap-2">
                <input type="radio" checked={openFromSync} onChange={() => setOpenFromSync(true)} className="rounded" />
                Sync klasöründen aç (G1.3 — diğer cihazdaki veriyi kullan)
              </Label>
            </div>
          )}

          {openFromSync && isFirstRun && (
            <>
              <div className="space-y-2">
                <Label>Sync klasörü (vault-sync.encrypted bu klasörde olmalı)</Label>
                <div className="flex gap-2">
                  <Input value={syncFolderPath} onChange={(e) => setSyncFolderPath(e.target.value)} placeholder="Klasör seçin" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const selected = await openDialog({ directory: true, title: "Sync klasörü seç" });
                      if (selected && typeof selected === "string") setSyncFolderPath(selected);
                      else if (Array.isArray(selected) && selected[0]) setSyncFolderPath(selected[0]);
                    }}
                  >
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sync-passphrase">Passphrase (diğer cihazdaki ile aynı)</Label>
                <Input
                  id="sync-passphrase"
                  type="password"
                  placeholder="En az 8 karakter"
                  value={syncPassphrase}
                  onChange={(e) => setSyncPassphrase(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          {!openFromSync && (
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input
                type="radio"
                checked={!usePassphrase}
                onChange={() => setUsePassphrase(false)}
                className="rounded"
              />
              Cihaz anahtarı (keychain’de sakla, passphrase gerekmez)
            </Label>
            <Label className="flex items-center gap-2">
              <input
                type="radio"
                checked={usePassphrase}
                onChange={() => setUsePassphrase(true)}
                className="rounded"
              />
              Passphrase belirle (unutma riski sende)
            </Label>
          </div>
          )}

          {!openFromSync && usePassphrase && (
            <>
              <div className="space-y-2">
                <Label htmlFor="passphrase">Passphrase</Label>
                <Input
                  id="passphrase"
                  type="password"
                  placeholder="En az 8 karakter"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Passphrase tekrar</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Aynı passphrase"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button onClick={submit} disabled={loading} className="w-full">
            {loading
              ? "İşleniyor…"
              : openFromSync
                ? "Sync klasöründen aç"
                : isFirstRun
                  ? "Anahtar oluştur ve başla"
                  : "Şifrele ve devam et"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
