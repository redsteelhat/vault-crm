/**
 * C2.1 — Global hızlı arama: Cmd/Ctrl+K, kişi/şirket/not sonuçları, hızlı geçiş.
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Contact, type Company, type GlobalSearchNoteHit } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { User, Building2, StickyNote } from "lucide-react";

const DEBOUNCE_MS = 200;

function formatDate(s: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("tr-TR");
  } catch {
    return s;
  }
}

type ResultItem =
  | { type: "contact"; contact: Contact }
  | { type: "company"; company: Company }
  | { type: "note"; hit: GlobalSearchNoteHit };

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const r = await api.globalSearch(q.trim());
      const items: ResultItem[] = [
        ...r.contacts.map((c) => ({ type: "contact" as const, contact: c })),
        ...r.companies.map((co) => ({ type: "company" as const, company: co })),
        ...r.note_hits.map((h) => ({ type: "note" as const, hit: h })),
      ];
      setResults(items);
      setSelectedIndex(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        if (!open) {
          setQuery("");
          setResults([]);
          setSelectedIndex(0);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (selectedIndex >= results.length) setSelectedIndex(Math.max(0, results.length - 1));
  }, [results.length, selectedIndex]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const child = el.children[selectedIndex] as HTMLElement | undefined;
    child?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  const handleSelect = (item: ResultItem) => {
    if (item.type === "contact") {
      navigate(`/contacts/${item.contact.id}`);
    } else if (item.type === "company") {
      navigate(`/companies/${item.company.id}`);
    } else {
      navigate(`/contacts/${item.hit.contact_id}`);
    }
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % Math.max(1, results.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/50"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-background shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-3 py-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Kişi, şirket veya not içeriği ara… (Cmd/Ctrl+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="border-0 shadow-none focus-visible:ring-0"
            autoFocus
          />
        </div>
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-2"
        >
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Aranıyor…</div>
          )}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-3 text-sm text-muted-foreground">Sonuç yok.</div>
          )}
          {!loading &&
            results.map((item, i) => {
              const isSelected = i === selectedIndex;
              let label = "";
              let sub = "";
              if (item.type === "contact") {
                label = `${item.contact.first_name} ${item.contact.last_name}`;
                sub = item.contact.company ?? item.contact.email ?? "";
              } else if (item.type === "company") {
                label = item.company.name;
                sub = item.company.industry ?? "";
              } else {
                label = item.hit.contact_name;
                sub = item.hit.body_snippet;
              }
              return (
                <button
                  key={
                    item.type === "contact"
                      ? `c-${item.contact.id}`
                      : item.type === "company"
                        ? `co-${item.company.id}`
                        : `n-${item.hit.note_id}`
                  }
                  type="button"
                  className={`flex w-full items-start gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                    isSelected ? "bg-accent text-accent-foreground" : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  {item.type === "contact" && <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                  {item.type === "company" && (
                    <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  {item.type === "note" && (
                    <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{label}</div>
                    {sub && (
                      <div className="truncate text-xs text-muted-foreground">
                        {item.type === "note" ? (
                          <>
                            {formatDate(item.hit.created_at)} · {sub}
                          </>
                        ) : (
                          sub
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}
