import { Sidebar } from "./Sidebar";
import { CommandPalette } from "../CommandPalette";
import { useReminderNotifications } from "@/hooks/useReminderNotifications";

export function MainLayout({ children }: { children: React.ReactNode }) {
  useReminderNotifications(); // D1.1: OS bildirimi periyodik kontrol
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}
