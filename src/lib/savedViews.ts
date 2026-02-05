/**
 * E1.3 — Kayıtlı filtreler (saved view): sık kullanılan filtreleri saklama.
 */

const STORAGE_KEY = "vault-crm-saved-views";

export interface SavedViewFilters {
  search: string;
  touchFilter: "" | "next_this_week" | "last_30_plus";
  fieldFilterId: string;
  fieldFilterValue: string;
  hashtag: string;
  city: string;
  filterMode: "and" | "or";
}

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewFilters;
  createdAt: string;
}

export function getSavedViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedView[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedView(name: string, filters: SavedViewFilters): SavedView {
  const views = getSavedViews();
  const id = `v-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const view: SavedView = {
    id,
    name: name.trim() || "Görünüm",
    filters: { ...filters },
    createdAt: new Date().toISOString(),
  };
  views.push(view);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  return view;
}

export function deleteSavedView(id: string): void {
  const views = getSavedViews().filter((v) => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}
