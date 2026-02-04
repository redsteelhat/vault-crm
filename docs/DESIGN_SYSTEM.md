# VaultLink / VaultCRM — Figma Design System Structure

Uygulanabilir Figma planı: sayfa yapısı, naming convention, component property/variant matrisi, design system backlog, Windows/macOS platform tuning.

**Kaynak:** VaultLink – Figma Design System Structure (FigJam diyagramı + bu doküman).
**Kod tarafı:** `tailwind.config.js`, `src/styles/globals.css`, `src/components/ui/*` bu plana göre token ve component yükseklikleri/varyantları ile uyumludur.

---

## 1) Figma File Yapısı (Pages + Sections + Frame Şablonları)

### Page: 00 — Cover & Index

**Amaç:** Herkesin 30 saniyede sistemi anlaması.

| Frame | İçerik |
|-------|--------|
| **Start Here** | Brand principles (Local-first, Encrypted, No account); token kaynakları ve linkler |
| **Release Notes** | v0.1 / v0.2 değişiklikleri |
| **Component Inventory** | Component listesi + status (Draft / Ready / Deprecated) |
| **Accessibility Checklist** | Contrast, focus ring, keyboard nav |

**Naming:** `INDEX / ...`, `DOC / ...`

---

### Page: 01 — Foundations

| Section | Frames |
|--------|--------|
| **01 Colors** | FND / Color / Light · FND / Color / Dark · FND / Color / Semantic (success, warn, error, info) · FND / Color / Usage Examples |
| **02 Typography** | FND / Type / Scale · FND / Type / Styles (H1..Caption) · FND / Type / Platform Tuning (macOS vs Windows) |
| **03 Layout** | FND / Grid / 8pt · FND / Spacing / Scale · FND / Radius / Scale · FND / Elevation / Shadows (Light) & Borders (Dark) |
| **04 Iconography** | FND / Icon / Stroke & Sizing · FND / Illustration / Rules |
| **05 Motion** | FND / Motion / Duration · FND / Motion / Easing · FND / Motion / Interaction patterns (hover, press, open/close) |

---

### Page: 02 — Components

Primitive → composite → patterns mantığı.

| Section | Components |
|--------|------------|
| **A Primitives** | CMP / Button · CMP / IconButton · CMP / Input · CMP / TextArea · CMP / Badge · CMP / Avatar · CMP / Divider · CMP / Spinner |
| **B Form** | CMP / Select · CMP / Checkbox · CMP / Radio · CMP / Switch · CMP / DatePicker · CMP / Field / Label+Helper+Error |
| **C Navigation** | CMP / Sidebar · CMP / Tabs · CMP / Breadcrumb · CMP / Topbar (optional) |
| **D Data Display** | CMP / Table · CMP / DataRow · CMP / Card · CMP / ListItem · CMP / EmptyState · CMP / PillFilter |
| **E Feedback** | CMP / Toast · CMP / Dialog · CMP / Tooltip · CMP / DropdownMenu |
| **F Editors** | CMP / NoteEditor · CMP / MarkdownBlock · CMP / TimelineItem |

Her component için: **Specs frame** (props table + do/don’t) + **Playground** (instance examples).

---

### Page: 03 — Templates

| Frame | Açıklama |
|-------|----------|
| TPL / App Shell | Sidebar + Content |
| TPL / Dashboard | |
| TPL / Contacts List + Filters | |
| TPL / Contact Detail | Header + Timeline + Notes + Reminders |
| TPL / Import Flow | CSV / LinkedIn |
| TPL / Settings | Security / Backup / Theme |
| TPL / Empty / First Run | |

---

### Page: 04 — Marketing

| Frame | İçerik |
|-------|--------|
| MKT / Landing / Sections | Hero, Trust strip, Features, Pricing, FAQ |
| MKT / Screenshot Frames | desktop |
| MKT / Social | X + LinkedIn |
| MKT / App Store-like | optional |

### Page: 99 — Archive

`DEPRECATED / ...` — kullanım dışı bileşenler.

---

## 2) Component Variant Sistemi (Figma Properties Standardı)

Tüm component’lerde aynı property sözlüğü kullanılır.

| Property | Değerler |
|----------|----------|
| **variant** | primary \| secondary \| ghost \| destructive \| subtle |
| **size** | sm \| md \| lg |
| **state** | default \| hover \| pressed \| focus \| disabled \| loading |
| **tone** | neutral \| info \| success \| warning \| danger |
| **icon** | none \| leading \| trailing \| only |
| **density** | comfortable \| compact |
| **theme** | light \| dark (mümkünse page-level) |

### Örnek: CMP / Button

- **variant:** primary, secondary, ghost, destructive  
- **size:** sm (36h), md (44h), lg (52h)  
- **state:** default, hover, pressed, focus, disabled, loading  
- **icon:** none, leading, trailing, only  
- **width:** hug \| fill  

### Örnek: CMP / Input

- **size:** sm (36h), md (44h)  
- **state:** default, focus, disabled, error  
- **affix:** none, leadingIcon, trailingIcon, clearButton  
- **validation:** neutral, error, success  

---

## 3) Design System Backlog (Build Order + AC)

| Öncelik | Kapsam | Acceptance Criteria |
|---------|--------|---------------------|
| **P0 — Foundations** | Color tokens (light/dark + semantic), Typography styles, Spacing/radius/elevation, Focus ring | Tüm semantic durumlar (success/warn/error/info) light+dark çalışır; H1–Caption + line-height set, TR karakter testi; 8pt grid, 4 radius seviyesi, light shadow + dark border; klavyede her interactive’te focus ring görünür. |
| **P1 — Primitives** | Button, IconButton, Input, TextArea, Field wrapper, Badge, Avatar, Divider, Spinner, Toast, Tooltip | States/variants tamam; min contrast; instance örnekleri var. |
| **P2 — Core Patterns** | Dialog, DropdownMenu, Tabs, Sidebar, Table | Keyboard nav + focus order + overflow tanımlı. |
| **P3 — Product-Specific** | ContactCard, ListItem, TimelineItem, NoteEditor, ReminderRow, Import mapping row | Templates ile assemble edilebilir; desktop adaptive. |
| **P4 — Templates** | App Shell, Dashboard, Contacts List, Contact Detail, Import Flow, Settings | Her template sadece component’lerle kurulur (no ad-hoc). |
| **P5 — Marketing** | Landing sections, Pricing/FAQ, Social | Aynı tokens/typography; screenshot frame standardı. |

---

## 4) Windows / macOS Platform Tuning (Desktop Tipografi)

### 4.1 Font Family Fallback

- **Primary:** Inter  
- **Fallback:** system-ui, -apple-system, Segoe UI, Roboto, Arial  
- **Mono:** IBM Plex Mono → ui-monospace, SFMono-Regular, Menlo, Consolas  

### 4.2 Weight Tuning

| Rol | Windows (ClearType) | macOS |
|-----|--------------------|--------|
| Body/Default | 500 (Inter Medium) — 400 çok ince kalabiliyor | 400 (450 hedef; Inter’de 450 yoksa 400) |
| Heading | 600–700 sabit | 600–700 sabit |

### 4.3 Size / Line-height

| Rol | Windows | macOS |
|-----|---------|--------|
| Caption | 13px (12px yerine readability) | 12px |
| Body 14px | line-height 22px | 20px |
| Body 16px | line-height 24px | 24px |

### 4.4 Component Height Standardı (desktop)

- Input / Button **md = 44px** (her iki platformda “native” his).
- Table row: **44px** comfortable, **36px** compact.

### 4.5 QA Checklist (platform tuning)

- [ ] Windows 125% scaling test  
- [ ] macOS retina + non-retina test  
- [ ] Font smoothing açık/kapalı — headline clipping kontrolü  
- [ ] Focus ring + hover contrast kontrolü  

---

## 5) Naming & Hygiene (Figma)

| Tip | Kural | Örnek |
|-----|--------|--------|
| **Components** | CMP / &lt;Name&gt; / &lt;Part&gt; | CMP / Button / Root |
| **Variants** | Property ile; isimde encode etme | “Button/Primary/MD/Hover” yapma; property kullan |
| **Color styles** | CLR / &lt;Theme&gt; / &lt;Role&gt; | CLR / Light / Primary |
| **Text styles** | TXT / &lt;Role&gt; / &lt;Size&gt; | TXT / Body / M |

Her component’te:

- **Specs frame** (props table + do/don’t)  
- **Anatomy frame**  
- **States strip**  
- **Examples frame**  

---

*Bu belge, Figma file yapısı ve kod tarafındaki token/component uyumunu tek kaynak olarak kullanmak için güncellenebilir.*
