# VaultCRM Beta Program

## Overview

The VaultCRM Beta Program provides early access to new features and improvements before they reach the stable channel. Beta testers help us identify issues, validate features, and shape the product roadmap.

---

## Target Audience

### Ideal Beta Testers
- **Consultants & Freelancers**: Managing 50-500 professional relationships
- **Sales Professionals**: Privacy-conscious, need local-first CRM
- **Founders & Executives**: High-value network management
- **Privacy Advocates**: Users who prioritize data ownership

### Technical Requirements
- Comfortable with beta software (potential bugs)
- Willing to provide feedback
- Can export diagnostics when issues occur
- Stable internet for update checks (data stays local)

---

## How to Join

1. Download VaultCRM from [releases page](https://github.com/redsteelhat/vault-crm/releases)
2. Go to **Settings > Updates**
3. Change **Update Channel** to "Beta"
4. Click **Check for Updates** to get the latest beta build

---

## Feedback SLA (Service Level Agreement)

### Response Times

| Severity | Description | Initial Response | Resolution Target |
|----------|-------------|------------------|-------------------|
| **P0** | App crash, data loss, security issue | < 4 hours | < 24 hours |
| **P1** | Major feature broken, migration failure | < 24 hours | < 72 hours |
| **P2** | Minor issue, UX problem | < 72 hours | Next beta release |

### Feedback Channels

1. **In-App Feedback**: Settings > Diagnostics & Support > Send Feedback
2. **GitHub Issues**: [github.com/redsteelhat/vault-crm/issues](https://github.com/redsteelhat/vault-crm/issues)
3. **Email**: beta@vaultcrm.app

### When Reporting Issues

Please include:
- VaultCRM version (Settings > About)
- Operating system and version
- Steps to reproduce the issue
- Screenshots if applicable
- **Diagnostics export** (Settings > Export Diagnostics) - contains NO personal data

---

## Issue Triage Taxonomy

### Type Labels

| Label | Description |
|-------|-------------|
| `bug:crash` | Application crash or freeze |
| `bug:data` | Data corruption, loss, or sync issues |
| `bug:import` | CSV import problems |
| `bug:updater` | Auto-update failures |
| `bug:license` | License activation issues |
| `bug:ux` | User experience problems |

### Severity Labels

| Label | Criteria |
|-------|----------|
| `severity:P0` | Crash, data loss, security vulnerability |
| `severity:P1` | Major feature completely broken |
| `severity:P2` | Minor issue, workaround available |

### Area Labels

| Label | Scope |
|-------|-------|
| `area:vault` | Encryption, password, lock/unlock |
| `area:search` | Contact search functionality |
| `area:followups` | Follow-ups, reminders, notifications |
| `area:migration` | Legacy data migration |
| `area:backup` | Backup/restore operations |

---

## Beta KPIs

We track these metrics to measure beta success:

### 1. Activation Rate
**Definition**: Percentage of beta users who complete CSV import  
**Target**: > 80%  
**Why**: Import is the key activation moment

### 2. Habit Formation
**Definition**: Days a user opens "Due Today" queue in their first 7 days  
**Target**: >= 3 days  
**Why**: Indicates product stickiness

### 3. Search Value
**Definition**: Number of searches per active user per day  
**Target**: >= 2 searches/day  
**Why**: Search is the core value proposition

### 4. Migration Success Rate
**Definition**: Percentage of legacy migrations that complete without entering Safe Mode  
**Target**: > 95%  
**Why**: Critical for upgrade path

### 5. License Activation Success
**Definition**: Percentage of license activations that succeed on first attempt  
**Target**: > 98%  
**Why**: Monetization funnel health

---

## Beta Release Cadence

### Weekly Beta Builds
- Released every **Tuesday** (if changes are ready)
- Version format: `1.0.1-beta.1`, `1.0.1-beta.2`, etc.
- Each build includes changelog in release notes

### Promotion to Stable
- Beta feature validated for **2 weeks minimum**
- No P0/P1 bugs in last 7 days
- At least 10 beta users on the build
- Stable version: `1.0.1` (drops beta suffix)

---

## What's Expected from Beta Testers

### Do
- Use VaultCRM as your daily CRM
- Report bugs through proper channels
- Include diagnostics with bug reports
- Share feature suggestions
- Update to latest beta builds

### Don't
- Rely solely on beta for critical business data (keep backups)
- Expect stability equal to stable channel
- Share beta builds publicly

---

## Beta Perks

- Early access to new features
- Direct influence on product roadmap
- Recognition in release notes (optional)
- Extended trial period for paid features
- Lifetime discount for beta contributors

---

## Opt-Out

To leave the beta program:
1. Go to **Settings > Updates**
2. Change **Update Channel** to "Stable"
3. You'll receive the next stable update

Note: Downgrading from beta to stable may require data migration. Always keep backups.

---

## Contact

- **Beta Coordinator**: beta@vaultcrm.app
- **GitHub**: [github.com/redsteelhat/vault-crm](https://github.com/redsteelhat/vault-crm)
- **Community**: [community.vaultcrm.app](https://community.vaultcrm.app)

---

Thank you for helping make VaultCRM better!
