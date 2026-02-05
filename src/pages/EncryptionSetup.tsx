import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, AlertTriangle } from "lucide-react";

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

  const isFirstRun = reason === "first_run";

  const submit = async () => {
    setError(null);
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

          {usePassphrase && (
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
            {loading ? "İşleniyor…" : isFirstRun ? "Anahtar oluştur ve başla" : "Şifrele ve devam et"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
