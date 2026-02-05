# VaultCRM

Kişisel CRM — bağlantılar, notlar ve hatırlatıcılar tamamen cihazında. Bulut hesabı yok, veri SQLite ile local.

## Tech Stack

- **Desktop:** Tauri 2 (Rust) — Windows, macOS, Linux
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Radix UI (shadcn-style)
- **State:** Zustand
- **Veritabanı:** SQLite (rusqlite) + FTS5 full-text search
- **Bildirim:** Tauri notification plugin (OS native)

## Gereksinimler

- Node.js 18+
- pnpm
- Rust (rustup) — Tauri için
- Windows: Visual Studio Build Tools; macOS: Xcode CLI; Linux: build-essential, libgtk-3-dev, libwebkit2gtk-4.1-dev

## Kurulum

```bash
pnpm install
```

## Geliştirme

```bash
pnpm tauri dev
```

Vite dev server + Tauri penceresi açılır.

## Build

```bash
pnpm tauri build
```

Çıktı: `src-tauri/target/release/bundle/` (installer ve binary).

## MVP Akışı

1. **İndir-kur** — Uygulamayı aç.
2. **CSV Import** — LinkedIn “Verilerinizin bir kopyasını alın” ile indirdiğin Connections.csv veya genel CSV’yi Import sayfasından yükle.
3. **Kişi kartı** — Kişilere tıkla, not ekle, şablonlar: Meeting Notes, Follow-up, Intro.
4. **Hatırlatıcı** — “14 gün sonra follow-up” ekle; yerel bildirim (Tauri) ile hatırlatılır.

Veri yalnızca cihazda (app data dir’de şifreli `vault.db.encrypted`; F1).

## Gizlilik ve offline (F2)

- **Offline by default (F2.1):** Tüm temel akışlar (kişiler, şirketler, notlar, hatırlatıcılar, import/export) ağ olmadan çalışır. Veri yalnızca yerel SQLite’dadır. “Sync” ayrı bir modül olarak planlanıyor (örn. G1 klasör senkronu).
- **Telemetri kapalı (F2.2):** Varsayılan olarak hiçbir kullanım verisi veya analitik gönderilmez.
- **Crash raporu (F2.3):** İsteğe bağlı; Ayarlar > Gizlilik’ten açılırsa crash log anonim olarak gönderilebilir (özellik ileride tamamlanacak).

## İkonlar

Uygulama ikonu için `pnpm tauri icon` ile kendi ikonunu üretebilirsin (kaynak: `app-icon.png`). Varsayılan placeholder kullanılabilir.

## Lisans

Özel lisans (one-time $49) — dağıtım ve lisans doğrulama backlog’ta.
