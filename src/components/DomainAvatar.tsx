/**
 * A2.4: Domain girilince logo önerisi — tamamen local (network yok).
 * Domain'in ilk harfini daire içinde gösterir (favicon yerine placeholder).
 */
import { cn } from "@/lib/utils";

function domainInitial(domain: string | null | undefined): string {
  if (!domain?.trim()) return "?";
  const clean = domain.trim().replace(/^https?:\/\//, "").split("/")[0] || "";
  const first = clean.charAt(0).toUpperCase();
  return /[A-Za-z0-9]/.test(first) ? first : "?";
}

export function DomainAvatar({
  domain,
  className,
  size = "md",
}: {
  domain: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  if (!domain?.trim()) return null;
  const initial = domainInitial(domain);
  const sizeClass =
    size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-10 w-10 text-sm";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-muted font-medium text-muted-foreground",
        sizeClass,
        className
      )}
      title={domain}
    >
      {initial}
    </span>
  );
}
