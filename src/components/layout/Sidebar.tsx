import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Building2,
  Upload,
  Settings,
  GitMerge,
} from "lucide-react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/inbox", label: "Inbox (Next action)", icon: Inbox },
  { to: "/contacts", label: "Kişiler", icon: Users },
  { to: "/companies", label: "Şirketler", icon: Building2 },
  { to: "/dedup", label: "Duplikatlar", icon: GitMerge },
  { to: "/import", label: "Import", icon: Upload },
  { to: "/settings", label: "Ayarlar", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  return (
    <aside className="flex w-56 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4 font-semibold">
        VaultCRM
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {nav.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
              location.pathname === to || (to !== "/" && location.pathname.startsWith(to + "/"))
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
