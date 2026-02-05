import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../CommandPalette";

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
