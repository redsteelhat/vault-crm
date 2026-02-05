import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Dashboard } from "@/pages/Dashboard";
import { Contacts } from "@/pages/Contacts";
import { ContactDetail } from "@/pages/ContactDetail";
import { Companies } from "@/pages/Companies";
import { CompanyDetail } from "@/pages/CompanyDetail";
import { Settings } from "@/pages/Settings";
import { Import } from "@/pages/Import";
import { Dedup } from "@/pages/Dedup";
import { Export } from "@/pages/Export";
import { EncryptionSetup } from "@/pages/EncryptionSetup";
import { Inbox } from "@/pages/Inbox";
import { api } from "@/lib/api";

type EncryptionState = "loading" | "ready" | { need_setup: "first_run" | "migrate_plain" };

function App() {
  const [encryptionState, setEncryptionState] = useState<EncryptionState>("loading");

  useEffect(() => {
    api
      .getEncryptionState()
      .then((res) => {
        if ("need_setup" in res && res.need_setup) {
          setEncryptionState({ need_setup: res.need_setup.reason });
        } else {
          setEncryptionState("ready");
        }
      })
      .catch(() => setEncryptionState("ready"));
  }, []);

  if (encryptionState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Yükleniyor…</p>
      </div>
    );
  }

  if (typeof encryptionState === "object" && "need_setup" in encryptionState) {
    return (
      <EncryptionSetup
        reason={encryptionState.need_setup}
        onComplete={() => setEncryptionState("ready")}
      />
    );
  }

  return (
    <MainLayout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contacts/:id" element={<ContactDetail />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/import" element={<Import />} />
          <Route path="/export" element={<Export />} />
          <Route path="/dedup" element={<Dedup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </MainLayout>
  );
}

export default App;
