import { Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Dashboard } from "@/pages/Dashboard";
import { Contacts } from "@/pages/Contacts";
import { ContactDetail } from "@/pages/ContactDetail";
import { Companies } from "@/pages/Companies";
import { CompanyDetail } from "@/pages/CompanyDetail";
import { Settings } from "@/pages/Settings";
import { Import } from "@/pages/Import";
import { Dedup } from "@/pages/Dedup";

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/import" element={<Import />} />
        <Route path="/dedup" element={<Dedup />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
