# VaultCRM Architecture

**Last Updated**: January 2026

---

## Overview

VaultCRM is a local-first Electron application built with React, TypeScript, and SQLite (via sql.js WASM). All data is encrypted at rest using AES-256-GCM.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              VaultCRM                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     RENDERER PROCESS                             │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │   │
│  │  │   React UI   │  │   Zustand    │  │  React       │           │   │
│  │  │  Components  │  │   Stores     │  │  Router      │           │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘           │   │
│  │         │                 │                 │                    │   │
│  │         └─────────────────┴─────────────────┘                    │   │
│  │                           │                                      │   │
│  │                  ┌────────┴────────┐                             │   │
│  │                  │  contextBridge  │  (Preload Script)           │   │
│  │                  │   window.api    │                             │   │
│  │                  └────────┬────────┘                             │   │
│  └───────────────────────────┼──────────────────────────────────────┘   │
│                              │ IPC (invoke/handle)                      │
│  ┌───────────────────────────┼──────────────────────────────────────┐   │
│  │                     MAIN PROCESS                                 │   │
│  │                           │                                      │   │
│  │                  ┌────────┴────────┐                             │   │
│  │                  │  IPC Handlers   │                             │   │
│  │                  └────────┬────────┘                             │   │
│  │         ┌─────────────────┼─────────────────┐                    │   │
│  │         │                 │                 │                    │   │
│  │  ┌──────┴──────┐  ┌───────┴───────┐  ┌──────┴──────┐            │   │
│  │  │   Services  │  │  Repositories │  │  Database   │            │   │
│  │  │             │  │               │  │  Connection │            │   │
│  │  │ - Keychain  │  │ - Contacts    │  │             │            │   │
│  │  │ - Exporter  │  │ - Followups   │  │ - sql.js    │            │   │
│  │  │ - Importer  │  │ - Interactions│  │ - Encrypt   │            │   │
│  │  │ - Scheduler │  │ - Tags        │  │ - Decrypt   │            │   │
│  │  │ - License   │  │ - Settings    │  │             │            │   │
│  │  │ - Updater   │  │               │  │             │            │   │
│  │  └──────┬──────┘  └───────┬───────┘  └──────┬──────┘            │   │
│  │         │                 │                 │                    │   │
│  └─────────┼─────────────────┼─────────────────┼────────────────────┘   │
│            │                 │                 │                        │
├────────────┼─────────────────┼─────────────────┼────────────────────────┤
│            │                 │                 │                        │
│       ┌────┴────┐      ┌─────┴─────┐    ┌──────┴──────┐                 │
│       │   OS    │      │ Encrypted │    │   Config    │                 │
│       │Keychain │      │  SQLite   │    │   JSON      │                 │
│       │         │      │   .db     │    │             │                 │
│       └─────────┘      └───────────┘    └─────────────┘                 │
│                                                                         │
│                         LOCAL STORAGE                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **UI Framework** | React 18 | Component-based UI |
| **Styling** | Tailwind CSS + shadcn/ui | Utility-first CSS + Component library |
| **State Management** | Zustand | Lightweight, hooks-based stores |
| **Routing** | React Router (HashRouter) | SPA navigation |
| **Build Tool** | electron-vite | Fast development and production builds |
| **Desktop Runtime** | Electron 33 | Cross-platform desktop app |
| **Database** | sql.js (SQLite WASM) | In-memory SQLite, no native compilation |
| **Encryption** | Node.js crypto | AES-256-GCM, PBKDF2 |
| **Key Storage** | keytar | OS Keychain integration |
| **i18n** | react-i18next | Multi-language support |
| **Package Manager** | pnpm | Fast, disk-efficient |

---

## Directory Structure

```
VaultCRM/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window creation
│   │   ├── ipc/
│   │   │   ├── channels.ts      # IPC channel definitions
│   │   │   └── handlers.ts      # IPC handler registration
│   │   ├── database/
│   │   │   ├── sqlite/
│   │   │   │   └── connection.ts # sql.js + encryption
│   │   │   ├── repositories/    # Data access layer
│   │   │   │   ├── contacts.ts
│   │   │   │   ├── followups.ts
│   │   │   │   ├── interactions.ts
│   │   │   │   ├── tags.ts
│   │   │   │   └── settings.ts
│   │   │   ├── legacy/
│   │   │   │   └── json-migrator.ts
│   │   │   ├── schema.ts        # SQLite schema
│   │   │   └── types.ts         # TypeScript types
│   │   ├── services/
│   │   │   ├── keychain.ts      # OS Keychain management
│   │   │   ├── exporter.ts      # CSV + Backup export
│   │   │   ├── importer.ts      # CSV import
│   │   │   ├── scheduler.ts     # Follow-up notifications
│   │   │   ├── license.ts       # Offline license verification
│   │   │   ├── updater.ts       # Auto-update service
│   │   │   ├── diagnostics.ts   # System info export
│   │   │   ├── recovery.ts      # Safe mode / crash recovery
│   │   │   └── notifications.ts # System notifications
│   │   └── utils/
│   │       └── crypto.ts        # Encryption utilities
│   │
│   ├── preload/
│   │   ├── index.ts             # contextBridge API exposure
│   │   └── index.d.ts           # TypeScript declarations
│   │
│   └── renderer/                # React frontend
│       ├── App.tsx              # Root component + routing
│       ├── main.tsx             # React entry point
│       ├── components/
│       │   ├── layout/          # Layout components
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   └── MainLayout.tsx
│       │   └── ui/              # shadcn/ui components
│       ├── pages/
│       │   ├── Dashboard.tsx
│       │   ├── Contacts.tsx
│       │   ├── ContactDetail.tsx
│       │   ├── FollowUps.tsx
│       │   ├── SmartLists.tsx
│       │   ├── Import.tsx
│       │   ├── Settings.tsx
│       │   └── Unlock.tsx
│       ├── stores/              # Zustand stores
│       │   ├── contactStore.ts
│       │   ├── followupStore.ts
│       │   └── uiStore.ts
│       ├── hooks/               # Custom React hooks
│       ├── lib/                 # Utilities
│       ├── i18n/                # Internationalization
│       │   ├── index.ts
│       │   └── locales/
│       │       ├── en/
│       │       ├── tr/
│       │       ├── de/
│       │       └── fr/
│       └── styles/
│           └── globals.css
│
├── docs/                        # Documentation
├── scripts/                     # Build/test scripts
├── resources/                   # App resources (icons, etc.)
├── release/                     # Build output
└── .github/                     # CI/CD workflows
```

---

## Data Flow

### Read Operation (e.g., Get Contacts)

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   React UI     │    │   IPC Handler  │    │  Repository    │
│                │    │                │    │                │
│ contactStore   │───▶│ contacts:      │───▶│ getAllContacts │
│ .fetchContacts │    │ getAll         │    │ ()             │
└────────────────┘    └────────────────┘    └───────┬────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │   sql.js      │
                                            │   (in-memory) │
                                            │               │
                                            │ SELECT * FROM │
                                            │ contacts      │
                                            └───────────────┘
```

### Write Operation (e.g., Create Contact)

```
┌────────────────┐    ┌────────────────┐    ┌────────────────┐
│   React UI     │    │   IPC Handler  │    │  Repository    │
│                │    │                │    │                │
│ createContact  │───▶│ contacts:      │───▶│ createContact  │
│ (data)         │    │ create         │    │ (data)         │
└────────────────┘    └────────────────┘    └───────┬────────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │   sql.js      │
                                            │   INSERT INTO │
                                            │   contacts    │
                                            └───────┬───────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │ saveDatabase  │
                                            │               │
                                            │ 1. Export     │
                                            │ 2. Encrypt    │
                                            │ 3. Write      │
                                            └───────────────┘
```

---

## Encryption Flow

### Database Encryption Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VAULT LOCKED                                │
│                                                                     │
│  ┌─────────────────┐                      ┌─────────────────┐      │
│  │ Encrypted File  │                      │   OS Keychain   │      │
│  │ (vaultcrm.db)   │                      │                 │      │
│  │                 │                      │ Encryption Key  │      │
│  │ [VCDB Header]   │                      │ (256-bit)       │      │
│  │ [Ciphertext]    │                      │                 │      │
│  └─────────────────┘                      └─────────────────┘      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ User enters password
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         UNLOCKING                                   │
│                                                                     │
│  password + salt ──▶ PBKDF2 (100k iter) ──▶ derived_key            │
│                                                                     │
│  derived_key + ciphertext ──▶ AES-256-GCM ──▶ plaintext_db         │
│                                                                     │
│  plaintext_db ──▶ sql.js.open() ──▶ in-memory SQLite               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        VAULT UNLOCKED                               │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    sql.js (WASM)                            │   │
│  │                                                              │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐   │   │
│  │  │ contacts  │ │ followups │ │interactions│ │   tags    │   │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘   │   │
│  │  ┌───────────┐                                              │   │
│  │  │ settings  │  (decrypted, in-memory only)                 │   │
│  │  └───────────┘                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ On save/lock
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SAVING                                     │
│                                                                     │
│  sql.js.export() ──▶ plaintext_buffer                              │
│                                                                     │
│  plaintext_buffer + key ──▶ AES-256-GCM ──▶ ciphertext             │
│                                                                     │
│  [VCDB] + [version] + [IV] + [authTag] + [ciphertext]              │
│                              │                                      │
│                              ▼                                      │
│                     Write to vaultcrm.db                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## IPC API Reference

### Vault Operations

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `vault:unlock` | invoke | Unlock vault with password |
| `vault:lock` | invoke | Lock vault immediately |
| `vault:isLocked` | invoke | Check lock status |
| `vault:changePassword` | invoke | Change master password |
| `vault:locked` | on (event) | Vault was locked (timeout/manual) |

### Contact Operations

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `contacts:getAll` | invoke | Get all contacts |
| `contacts:getById` | invoke | Get single contact |
| `contacts:create` | invoke | Create new contact |
| `contacts:update` | invoke | Update contact |
| `contacts:delete` | invoke | Soft-delete contact |
| `contacts:search` | invoke | Search contacts |
| `contacts:getStale` | invoke | Get stale contacts |
| `contacts:getHotList` | invoke | Get hot leads |

### Follow-up Operations

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `followups:getAll` | invoke | Get all follow-ups |
| `followups:getDueToday` | invoke | Get today's follow-ups |
| `followups:getOverdue` | invoke | Get overdue follow-ups |
| `followups:getUpcoming` | invoke | Get upcoming follow-ups |
| `followups:create` | invoke | Create follow-up |
| `followups:markDone` | invoke | Mark as completed |
| `followups:snooze` | invoke | Snooze to new date |

---

## Database Schema

### Core Tables

```sql
-- Contacts
CREATE TABLE contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    title TEXT,
    emails TEXT DEFAULT '[]',      -- JSON array
    phones TEXT DEFAULT '[]',      -- JSON array
    location TEXT,
    source TEXT,
    notes TEXT,
    last_contact_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT                -- Soft delete
);

-- Interactions
CREATE TABLE interactions (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    type TEXT NOT NULL,            -- note, call, meeting, email
    content TEXT,
    occurred_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

-- Follow-ups
CREATE TABLE followups (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    due_at TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending, done, snoozed
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

-- Tags
CREATE TABLE tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#10b981',
    created_at TEXT NOT NULL
);

-- Contact-Tag Junction
CREATE TABLE contact_tags (
    contact_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Settings
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_contacts_name ON contacts(name);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_contacts_deleted ON contacts(deleted_at);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_followups_contact ON followups(contact_id);
CREATE INDEX idx_followups_due ON followups(due_at);
CREATE INDEX idx_followups_status ON followups(status);
```

---

## Security Model

### Process Isolation

```
┌─────────────────────────────────────────────────────────────┐
│                     Renderer Process                        │
│                                                             │
│   nodeIntegration: false                                    │
│   contextIsolation: true                                    │
│   sandbox: true                                             │
│                                                             │
│   Cannot access:                                            │
│   - Node.js APIs                                            │
│   - File system                                             │
│   - Encryption keys                                         │
│                                                             │
│   Can only access:                                          │
│   - window.api.* (exposed via contextBridge)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ IPC (allowlist only)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│                                                             │
│   Full Node.js access                                       │
│   Handles all sensitive operations:                         │
│   - Encryption/Decryption                                   │
│   - File I/O                                                │
│   - Keychain access                                         │
│   - License verification                                    │
└─────────────────────────────────────────────────────────────┘
```

### Content Security Policy

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data:;
font-src 'self';
connect-src 'self';
```

---

## Build & Distribution

### Build Pipeline

```
Source Code
     │
     ▼
┌─────────────┐
│ electron-   │  TypeScript compilation
│ vite build  │  + Vite bundling
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  out/       │  Compiled JS
│  ├── main   │  
│  ├── preload│  
│  └── renderer
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ electron-   │  Package into executable
│ builder     │  + Code signing (if available)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  release/   │  .exe, .dmg, .AppImage
│             │  + checksums
└─────────────┘
```

### Platform Outputs

| Platform | Format | Signing |
|----------|--------|---------|
| Windows | .exe (NSIS) | Authenticode (optional) |
| macOS | .dmg | Apple notarization (optional) |
| Linux | .AppImage, .deb | N/A |

---

## Performance Considerations

### Why sql.js (WASM)?

| Aspect | sql.js | native SQLite |
|--------|--------|---------------|
| Compilation | No native build needed | Requires build tools |
| Cross-platform | Works everywhere | Platform-specific binaries |
| Memory usage | Higher (in-memory) | Lower (mmap) |
| Performance | Good for <100k records | Better for large datasets |
| Encryption | App-level (flexible) | SQLCipher (complex setup) |

### Optimization Strategies

1. **Debounced saves**: Don't write to disk on every change
2. **Indexed queries**: All frequent queries use indexes
3. **Lazy loading**: Load contact details on demand
4. **Memory management**: Close database on lock

---

## Future Considerations

### Planned Improvements

1. **Open Core**: Extract crypto + format spec to separate package
2. **Plugin system**: Allow third-party integrations
3. **Sync protocol**: Optional encrypted sync between devices
4. **Mobile companion**: Read-only mobile viewer

### Scalability Limits

| Metric | Tested Limit | Performance |
|--------|--------------|-------------|
| Contacts | 10,000 | <100ms search |
| Interactions | 50,000 | <200ms load |
| Database size | 100MB | <500ms encrypt/decrypt |

---

**VaultCRM: Built for privacy. Designed for professionals.**
