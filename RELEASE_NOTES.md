# VaultCRM v1.0.0 Release Notes

**Release Date**: January 2026  
**Release Type**: General Availability (GA)

---

## Overview

VaultCRM is a **local-first, privacy-focused Personal CRM** for professionals who value data ownership. All your relationship data stays encrypted on your device—no cloud, no tracking, no third-party access.

---

## Key Features

### Privacy & Security
- **AES-256-GCM Encryption**: Military-grade encryption for all stored data
- **PBKDF2 Key Derivation**: 100,000 iterations for password-based key generation
- **OS Keychain Integration**: Encryption keys stored securely in Windows Credential Manager / macOS Keychain
- **Master Password Lock**: Configurable auto-lock with idle timeout (5/15/30/60 minutes)
- **Lock on Minimize**: Optional instant lock when app loses focus

### Contact Management
- Full contact profiles with company, title, location, and source tracking
- Multiple emails and phone numbers per contact
- Tag system for organization (Investor, Hot Lead, Partner, etc.)
- Soft delete with recovery capability
- Duplicate detection and merge functionality

### Interactions
- Four interaction types: Notes, Calls, Meetings, Emails
- Chronological interaction history per contact
- Quick-add interaction from contact detail page

### Follow-ups & Reminders
- Due date scheduling with reason tracking
- "Due Today" and "Overdue" smart queues
- Snooze functionality for rescheduling
- Desktop notifications for upcoming follow-ups
- Smart Lists: Stale Contacts, Hot Leads, VIP contacts

### Data Portability
- CSV import with column mapping
- CSV export of all contacts
- Full encrypted backup (ZIP with encrypted SQLite + CSV recovery)
- One-click restore from backup

### Auto-Updates
- Automatic update checking (configurable)
- Beta and Stable release channels
- Delta updates for faster downloads

---

## System Requirements

### Windows
- Windows 10 (64-bit) or later
- 4 GB RAM minimum
- 200 MB disk space

### macOS
- macOS 10.15 (Catalina) or later
- Intel or Apple Silicon (Universal Binary)
- 4 GB RAM minimum
- 200 MB disk space

### Linux
- Ubuntu 18.04+, Fedora 32+, or equivalent
- 4 GB RAM minimum
- 200 MB disk space
- `libsecret` for keychain integration

---

## Known Issues

### v1.0.0

| ID | Description | Workaround | Status |
|----|-------------|------------|--------|
| #001 | Large imports (>5,000 contacts) may take 30+ seconds | Import in batches | Investigating |
| #002 | FTS5 full-text search not available (using LIKE search) | Search still works, slightly slower on large datasets | By design (sql.js limitation) |
| #003 | First app launch may show brief white screen | Wait 1-2 seconds | Cosmetic only |

---

## Upgrade Notes

### From MVP (JSON storage) to v1.0.0 (SQLite)

If you have existing data from the MVP version:

1. **Automatic Migration**: On first launch, your data will be automatically migrated from JSON to encrypted SQLite
2. **Backup Created**: Original JSON file is archived in `data/archive/` folder
3. **Migration Status**: Check Settings > About for migration status
4. **Safe Mode**: If migration fails, the app enters Safe Mode with data export options

### Fresh Install

No special steps required. Create your master password and start using VaultCRM.

---

## Checksums (SHA256)

```
VaultCRM-1.0.0-setup.exe:     [Generated during release]
VaultCRM-1.0.0.dmg:           [Generated during release]
VaultCRM-1.0.0.AppImage:      [Generated during release]
```

Verify your download by comparing the SHA256 hash of your downloaded file with the values above.

---

## Feedback & Support

- **Bug Reports**: [GitHub Issues](https://github.com/redsteelhat/vault-crm/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/redsteelhat/vault-crm/discussions)
- **Email**: feedback@vaultcrm.app
- **Documentation**: [docs.vaultcrm.app](https://docs.vaultcrm.app)

---

## License

VaultCRM is proprietary software. See [LICENSE](LICENSE) for details.

---

## Acknowledgments

Built with:
- [Electron](https://electronjs.org/) - Desktop framework
- [React](https://reactjs.org/) - UI library
- [sql.js](https://sql.js.org/) - SQLite in WebAssembly
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Keytar](https://github.com/atom/node-keytar) - OS keychain integration

---

© 2026 VaultCRM. All rights reserved.
