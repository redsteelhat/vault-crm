# VaultCRM Security Model

**Last Updated**: January 2026

---

## Executive Summary

VaultCRM is a **local-first personal CRM** designed with security as a foundational principle. All data is encrypted at rest using AES-256-GCM and stored exclusively on the user's device. This document outlines our security architecture, threat model, and limitations.

---

## Threat Model

### What VaultCRM Protects Against

| Threat | Protection Level | How |
|--------|------------------|-----|
| **Disk theft / device loss** | Strong | Full database encryption with AES-256-GCM |
| **Offline data extraction** | Strong | Encrypted database file is unreadable without master password |
| **Backup file theft** | Strong | Backups are encrypted with the same master password |
| **Data in transit** | N/A | No network transmission (local-only) |
| **Unauthorized app access** | Medium | Master password + auto-lock + lock on minimize |
| **Memory forensics (unlocked)** | Limited | Data is decrypted in memory while vault is unlocked |

### What VaultCRM Does NOT Protect Against

| Threat | Why | Mitigation |
|--------|-----|------------|
| **OS-level access while unlocked** | Decrypted data exists in memory | Use short auto-lock timeout |
| **Keyloggers / screen capture** | Outside app scope | Use device-level security |
| **Physical access while unlocked** | App cannot detect physical presence | Lock on minimize, short timeout |
| **Weak master password** | User responsibility | We enforce minimum requirements |
| **Lost master password** | By design (no backdoor) | We cannot recover your data |

### Security Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR DEVICE                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   VaultCRM App                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Vault (Unlocked)                   │  │  │
│  │  │   - Decrypted data in memory                    │  │  │
│  │  │   - Accessible via UI                           │  │  │
│  │  │   - Auto-locks after timeout                    │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                                                       │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              Vault (Locked)                     │  │  │
│  │  │   - Encrypted database on disk                  │  │  │
│  │  │   - Key in OS Keychain                          │  │  │
│  │  │   - Requires master password to unlock          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Encryption Architecture

### Algorithms Used

| Component | Algorithm | Key Size | Notes |
|-----------|-----------|----------|-------|
| Database encryption | AES-256-GCM | 256 bits | Authenticated encryption |
| Key derivation | PBKDF2-SHA256 | 256 bits | 100,000 iterations |
| Key storage | OS Keychain | Platform | Windows Credential Manager / macOS Keychain |
| License verification | Ed25519 | 256 bits | Offline signature verification |

### Why These Choices

- **AES-256-GCM**: Industry standard authenticated encryption. Provides both confidentiality and integrity.
- **PBKDF2**: Slow key derivation protects against brute-force attacks on weak passwords.
- **100,000 iterations**: Balance between security and unlock speed (~300ms on modern hardware).
- **OS Keychain**: Leverages platform security for key protection.

### File Format (VCDB)

```
┌──────────────────────────────────────────────────────────────┐
│ Offset │ Size    │ Description                              │
├──────────────────────────────────────────────────────────────┤
│ 0      │ 4 bytes │ Magic bytes: "VCDB"                      │
│ 4      │ 2 bytes │ Format version (uint16 BE)               │
│ 6      │ 12 bytes│ Initialization Vector (IV)               │
│ 18     │ 16 bytes│ Authentication Tag                       │
│ 34     │ variable│ Encrypted SQLite database                │
└──────────────────────────────────────────────────────────────┘
```

The magic bytes allow format detection and backward compatibility.

---

## Vault Lifecycle

### 1. Vault Creation

```
User enters master password
        │
        ▼
┌───────────────────────┐
│ Validate password     │ (min 8 chars, uppercase, lowercase, number)
│ requirements          │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Generate random salt  │ (16 bytes)
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ PBKDF2(password, salt)│ → 256-bit encryption key
│ 100,000 iterations    │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Store key in OS       │ (Windows: Credential Manager)
│ Keychain              │ (macOS: Keychain Access)
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Create empty SQLite   │ → Encrypt with AES-256-GCM
│ database              │ → Write to vaultcrm.db
└───────────────────────┘
```

### 2. Vault Unlock

```
User enters master password
        │
        ▼
┌───────────────────────┐
│ Read salt from        │ (stored in config.json)
│ configuration         │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ PBKDF2(password, salt)│ → Derive key
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Read encrypted DB     │ → Parse VCDB header
│ from disk             │ → Extract IV and auth tag
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Decrypt with          │ If auth tag mismatch:
│ AES-256-GCM           │ → "Wrong password" error
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Load decrypted SQLite │ (sql.js WASM in memory)
│ into memory           │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Start idle timeout    │ (default: 15 minutes)
│ timer                 │
└───────────────────────┘
```

### 3. Vault Lock

```
Lock triggered (manual, timeout, or minimize)
        │
        ▼
┌───────────────────────┐
│ Encrypt current DB    │ → AES-256-GCM with random IV
│ state                 │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Write to disk with    │ → Atomic write (temp + rename)
│ VCDB header           │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Close sql.js instance │ → Free memory
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Clear encryption key  │ (key remains in OS Keychain)
│ from app memory       │
└───────────────────────┘
        │
        ▼
┌───────────────────────┐
│ Show unlock screen    │
└───────────────────────┘
```

---

## Password Security

### Requirements

We enforce minimum password requirements to prevent weak passwords:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### Master Password Handling

| Aspect | Implementation |
|--------|----------------|
| Storage | Never stored. Key derived on each unlock. |
| Transmission | Never transmitted. All operations are local. |
| Recovery | Not possible by design. No backdoor. |
| Change | Requires current password. Re-encrypts entire database. |

### Brute Force Protection

- **PBKDF2 with 100,000 iterations**: Makes each password attempt slow (~300ms)
- **No remote lockout needed**: Local-only, no network to throttle
- **Strong password = strong protection**: A 12+ character password with mixed case, numbers, and symbols is practically uncrackable

---

## IPC Security (Electron)

### Context Isolation

VaultCRM uses Electron's security best practices:

```javascript
// Main process: BrowserWindow options
{
  webPreferences: {
    nodeIntegration: false,      // Renderer cannot access Node.js
    contextIsolation: true,      // Separate contexts for main/renderer
    sandbox: true,               // OS-level sandboxing
    preload: preloadScriptPath   // Only allowed APIs exposed
  }
}
```

### API Allowlist

Only specific IPC channels are exposed via `contextBridge`:

| Namespace | Operations |
|-----------|------------|
| `vault` | lock, unlock, isLocked, changePassword |
| `contacts` | getAll, getById, create, update, delete, search |
| `followups` | getAll, getDueToday, getOverdue, markDone, snooze |
| `interactions` | getForContact, create, update, delete |
| `tags` | getAll, create, update, delete |
| `settings` | get, set |
| `export` | csv, backup |
| `import` | csv |

Arbitrary Node.js code cannot be executed from the renderer.

---

## Safe Mode & Recovery

### Crash Detection

If VaultCRM detects abnormal shutdown:

1. Offers safe mode (read-only access)
2. Allows export of data before reset
3. Lists available backups for restore

### Recovery Options

| Option | Description |
|--------|-------------|
| Safe Mode | Read-only access with limited features |
| Restore Backup | Load from encrypted backup file |
| Export & Reset | Export CSV, then reset database |
| Full Reset | Delete all data and start fresh |

---

## Third-Party Dependencies

### Cryptographic

| Package | Purpose | Audit Status |
|---------|---------|--------------|
| Node.js crypto | AES-GCM, PBKDF2 | Built-in, well-audited |
| keytar | OS Keychain access | Atom/GitHub maintained |

### Other Notable

| Package | Purpose | Security Notes |
|---------|---------|----------------|
| sql.js | SQLite WASM | No network, in-memory only |
| electron | Desktop runtime | Regular security updates |
| archiver | Backup creation | Local file operations only |

---

## What We Don't Do

VaultCRM is designed to minimize attack surface:

- **No telemetry**: We don't collect usage data
- **No analytics**: No third-party tracking (Google Analytics, Mixpanel)
- **No crash reporting**: No automatic error reporting (Sentry, Bugsnag)
- **No cloud sync**: Data never leaves your device
- **No account system**: No authentication servers
- **No auto-update without consent**: Updates require user action

---

## Responsible Disclosure

If you discover a security vulnerability in VaultCRM:

1. **Email**: security@vaultcrm.app
2. **Expected response**: Within 72 hours
3. **Public disclosure**: Coordinated after fix is available
4. **Credit**: We acknowledge researchers (with permission)

### Scope

In scope:
- Encryption/decryption flaws
- Authentication bypass
- Data leakage
- IPC privilege escalation
- Memory handling issues

Out of scope:
- Social engineering
- Physical access attacks
- Issues requiring malware on device
- Denial of service

---

## Security Recommendations

### For Users

1. **Use a strong master password**: 12+ characters, mix of types
2. **Enable auto-lock**: Settings > Vault Security > 5-15 minute timeout
3. **Enable lock on minimize**: Extra protection when switching apps
4. **Regular backups**: Keep encrypted backups in secure location
5. **Verify downloads**: Check SHA256 checksums of installer files
6. **Keep updated**: Security fixes are released promptly
7. **Device security**: Use full-disk encryption (BitLocker, FileVault)

### For Enterprises

VaultCRM is designed for individual professionals. For enterprise deployments:

- Each user should have their own vault
- No central key management (by design)
- Backups should be stored according to your data retention policy
- Consider endpoint security solutions for device protection

---

## Audit History

| Date | Type | Findings | Status |
|------|------|----------|--------|
| Jan 2026 | Internal review | Architecture documented | Complete |
| - | External audit | Not yet conducted | Planned |

We welcome security researchers to review our open-source cryptographic core.

---

## Summary

| Question | Answer |
|----------|--------|
| Is my data encrypted? | Yes, AES-256-GCM |
| Can VaultCRM read my data? | No, we don't have your password |
| Is my password stored? | No, only derived key in OS Keychain |
| What if I forget my password? | Data is unrecoverable (by design) |
| Is the code audited? | Internal review complete, external planned |
| Can I verify the build? | Yes, SHA256 checksums provided |

---

**VaultCRM: Your relationships. Encrypted. Yours.**
