# VaultCRM Privacy Statement

**Last Updated**: January 2026

---

## Our Privacy Promise

VaultCRM is built on a fundamental principle: **your data belongs to you**.

We designed VaultCRM as a **local-first application** specifically to ensure that your personal and professional relationship data never leaves your device without your explicit action.

---

## Data Storage

### Where Your Data Lives

| Data Type | Storage Location | Encryption |
|-----------|------------------|------------|
| Contacts, Interactions, Follow-ups | Your device only | AES-256-GCM |
| Master password | Never stored | N/A |
| Encryption key | OS Keychain | OS-level encryption |
| App settings | Your device only | Unencrypted (no PII) |

### What We Mean by "Local-First"

- **No cloud sync**: Your data is never uploaded to any server
- **No remote database**: Everything is stored in an encrypted SQLite file on your device
- **No account required**: You don't need to create an account or provide any personal information
- **Offline capable**: VaultCRM works without internet connection

---

## Encryption

### How Your Data is Protected

1. **AES-256-GCM**: Military-grade encryption for all stored data
2. **PBKDF2 Key Derivation**: Your master password is converted to an encryption key using 100,000 iterations
3. **Random IV**: Each encryption uses a unique initialization vector
4. **Authenticated Encryption**: Tamper detection prevents unauthorized modifications

### What This Means

- Without your master password, your data is unreadable
- We cannot recover your data if you forget your password
- Even if your device is compromised, the encrypted database is useless without the key

---

## Data Collection

### What We Collect

**Nothing.** VaultCRM does not:

- Track your usage
- Send analytics
- Log your activities
- Phone home
- Share data with third parties

### Exceptions (User-Initiated Only)

| Action | Data Sent | To Whom |
|--------|-----------|---------|
| Check for updates | App version, OS type | Our update server |
| Send feedback (optional) | Your message, app version, OS | Our email server |
| Export diagnostics (optional) | System info (see below) | You choose where to save |

---

## Diagnostics Export

When you export diagnostics for troubleshooting, the file contains:

### Included

- App version
- Operating system and version
- CPU/RAM information
- Database statistics (counts only: "42 contacts", not contact names)
- Recent error messages (technical, no PII)
- App settings (theme, timeouts, etc.)

### NOT Included

- Contact names, emails, phone numbers
- Interaction content
- Follow-up details
- Notes or any text you've entered
- Your master password
- Encryption keys

You can review the diagnostics file (it's a ZIP containing JSON) before sharing it with anyone.

---

## Backup & Export

### Encrypted Backups

When you create a backup:
- The backup is **encrypted** with your master password
- It contains your full database
- Only you can decrypt it

### CSV Exports

When you export to CSV:
- The file is **not encrypted**
- It contains your contact data in plain text
- Store it securely

---

## Third-Party Services

VaultCRM uses the following third-party services:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| GitHub Releases | Software distribution | None (public downloads) |
| OS Keychain | Key storage | Encryption key (stays on device) |

We do not use:
- Analytics services (Google Analytics, Mixpanel, etc.)
- Crash reporting services (Sentry, Bugsnag, etc.)
- Advertising networks
- Social login providers

---

## Your Rights

Because your data stays on your device, you have complete control:

- **Access**: Open the app anytime
- **Export**: CSV export or full backup
- **Delete**: Delete the app and its data folder
- **Portability**: Your data is in standard SQLite format

---

## Children's Privacy

VaultCRM is designed for professionals and is not intended for children under 13. We do not knowingly collect data from children.

---

## Security Recommendations

To maximize your privacy:

1. **Choose a strong master password**: At least 12 characters, mix of letters, numbers, symbols
2. **Enable auto-lock**: Settings > Vault Security > Auto-Lock Timeout
3. **Regular backups**: Keep encrypted backups in a secure location
4. **Device security**: Use full-disk encryption on your device
5. **Verify downloads**: Check SHA256 checksums of installer files

---

## Changes to This Policy

We may update this privacy statement occasionally. Changes will be:
- Documented in release notes
- Available at [docs.vaultcrm.app/privacy](https://docs.vaultcrm.app/privacy)
- Communicated through app updates

---

## Contact

For privacy-related questions:

- **Email**: privacy@vaultcrm.app
- **GitHub**: [github.com/redsteelhat/vault-crm](https://github.com/redsteelhat/vault-crm)

---

## Summary

| Question | Answer |
|----------|--------|
| Do you collect my data? | No |
| Is my data encrypted? | Yes, AES-256-GCM |
| Can you read my contacts? | No |
| Do you sell data? | No |
| Do you use analytics? | No |
| Can I use it offline? | Yes |
| Where is my data stored? | Only on your device |

---

**VaultCRM: Your relationships. Your data. Your control.**
