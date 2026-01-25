<p align="center">
  <img src="https://raw.githubusercontent.com/redsteelhat/vault-crm/main/resources/logo.png" alt="VaultCRM Logo" width="120" />
</p>

<h1 align="center">VaultCRM</h1>

<p align="center">
  <strong>Your relationships, encrypted on your device. No accounts. No cloud.</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#security">Security</a> •
  <a href="#pricing">Pricing</a> •
  <a href="#verification">Verification</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/Encryption-AES--256--GCM-green" alt="Encryption" />
  <img src="https://img.shields.io/badge/License-Proprietary-orange" alt="License" />
</p>

---

## Why VaultCRM?

Most CRMs store your contacts in the cloud. That means:
- Your data on someone else's servers
- Subscription fees forever
- No access without internet
- Privacy policies that can change

**VaultCRM is different.**

Your data stays on **your device**, encrypted with **military-grade encryption**, accessible **offline**, with a **one-time purchase**.

---

## Screenshots

<p align="center">
  <img src="docs/screenshots/dashboard.png" alt="Dashboard" width="800" />
</p>

<p align="center">
  <em>Dashboard - Your relationship management at a glance</em>
</p>

<p align="center">
  <img src="docs/screenshots/contacts.png" alt="Contacts" width="800" />
</p>

<p align="center">
  <em>Contacts - Manage your professional network</em>
</p>

<p align="center">
  <img src="docs/screenshots/followups.png" alt="Follow-ups" width="800" />
</p>

<p align="center">
  <em>Follow-ups - Never forget to stay in touch</em>
</p>

---

## Features

### 🔐 Vault-Grade Privacy

| Feature | Description |
|---------|-------------|
| **AES-256-GCM** | Military-grade encryption for all your data |
| **OS Keychain** | Encryption keys stored in Windows Credential Manager / macOS Keychain |
| **App Lock** | Auto-lock after inactivity, lock on minimize |
| **Safe Mode** | Recovery options if something goes wrong |

### 📅 Follow-up Engine

| Feature | Description |
|---------|-------------|
| **Smart Lists** | Automatically segment contacts by activity |
| **Due Today/Overdue** | Never miss a follow-up |
| **Stale Contacts** | Know who you haven't talked to in 30/60/90 days |
| **Notifications** | System notifications for due follow-ups |

### ✈️ Offline Commerce

| Feature | Description |
|---------|-------------|
| **No internet required** | Works completely offline |
| **Offline licensing** | License verification without internet |
| **Local backups** | Encrypted backups on your device |
| **No account needed** | No signup, no login, no cloud |

### ⚡ Power User Features

| Feature | Description |
|---------|-------------|
| **Command Palette** | `Ctrl+K` / `⌘K` for quick navigation |
| **LinkedIn Parser** | Paste LinkedIn profiles to import contacts |
| **CSV Import/Export** | Bulk import and export your data |
| **Multi-language** | English, Turkish, German, French |

---

## Installation

### Download

| Platform | Download |
|----------|----------|
| Windows | [VaultCRM-1.0.0-Setup.exe](https://github.com/redsteelhat/vault-crm/releases/latest) |
| macOS | [VaultCRM-1.0.0.dmg](https://github.com/redsteelhat/vault-crm/releases/latest) |
| Linux | [VaultCRM-1.0.0.AppImage](https://github.com/redsteelhat/vault-crm/releases/latest) |

### Quick Start

1. **Download** the installer for your platform
2. **Install** the application
3. **Create a vault** with a strong master password
4. **Import contacts** or add them manually
5. **Set up follow-ups** to stay in touch

---

## Security

VaultCRM is built with security as a foundational principle.

### Encryption Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Your Device                       │
│  ┌───────────────────────────────────────────────┐  │
│  │                 VaultCRM                      │  │
│  │                                               │  │
│  │  Master Password                              │  │
│  │       │                                       │  │
│  │       ▼                                       │  │
│  │  PBKDF2 (100k iterations)                     │  │
│  │       │                                       │  │
│  │       ▼                                       │  │
│  │  Encryption Key ───────────▶ OS Keychain     │  │
│  │       │                                       │  │
│  │       ▼                                       │  │
│  │  AES-256-GCM Encrypted Database              │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### What We Don't Do

- ❌ No telemetry or analytics
- ❌ No cloud sync
- ❌ No account system
- ❌ No data collection
- ❌ No third-party tracking

Read our full [Security Model](docs/SECURITY.md) and [Architecture](docs/ARCHITECTURE.md).

---

## Pricing

### Free Forever

| | Free | Pro ($49) |
|---|:---:|:---:|
| Contacts | 50 | Unlimited |
| Encryption | ✅ | ✅ |
| Offline Mode | ✅ | ✅ |
| CSV Import | ✅ | ✅ |
| Smart Lists | Basic | All |
| Duplicate Merge | ❌ | ✅ |
| Auto Backup | ❌ | ✅ |
| Full Export | CSV | CSV + Backup |

### One-Time Purchase

No subscriptions. Pay once, use forever. Updates included.

---

## Verification

### Verify Your Download

All releases include SHA256 checksums. Verify your download:

**Windows (PowerShell)**
```powershell
Get-FileHash VaultCRM-1.0.0-Setup.exe -Algorithm SHA256
```

**macOS/Linux**
```bash
shasum -a 256 VaultCRM-1.0.0.dmg
```

Compare the output with the checksum in `CHECKSUMS.txt` from the [release page](https://github.com/redsteelhat/vault-crm/releases).

### Code Signing

| Platform | Status |
|----------|--------|
| Windows | Signed (Authenticode) |
| macOS | Signed + Notarized (Apple) |
| Linux | N/A |

---

## Development

### Requirements

- Node.js 18+
- pnpm 8+

### Setup

```bash
# Clone the repository
git clone https://github.com/redsteelhat/vault-crm.git
cd vault-crm

# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build:win   # Windows
pnpm build:mac   # macOS
pnpm build:linux # Linux
```

---

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/redsteelhat/vault-crm/issues)
- **Email**: support@vaultcrm.app

---

## Privacy

VaultCRM is built on a fundamental principle: **your data belongs to you**.

- All data stored locally on your device
- AES-256-GCM encryption at rest
- No cloud, no servers, no accounts
- No analytics or tracking

Read our full [Privacy Policy](docs/PRIVACY.md).

---

## License

VaultCRM is proprietary software. See [LICENSE](LICENSE) for details.

The cryptographic core and database format are planned to be open-sourced.

---

<p align="center">
  <strong>VaultCRM: Your relationships. Encrypted. Yours.</strong>
</p>

<p align="center">
  Made with ❤️ for professionals who value privacy
</p>
