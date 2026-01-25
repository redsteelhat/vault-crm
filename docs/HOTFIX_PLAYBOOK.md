# VaultCRM Hotfix Playbook

## Purpose

This document defines the process for handling critical issues (P0/P1) that require immediate attention outside the normal release cycle.

---

## Severity Definitions

### P0 - Critical (Emergency)
**Impact**: Application unusable, data loss, or security vulnerability

**Examples**:
- App crashes on startup
- Data corruption or loss
- Encryption/decryption failures
- Security vulnerability
- Vault cannot be unlocked

**Response Time**: < 4 hours  
**Resolution Target**: < 24 hours

### P1 - High (Urgent)
**Impact**: Major feature completely broken, significant user impact

**Examples**:
- CSV import fails completely
- Search returns no results
- Follow-up notifications not working
- Auto-update broken
- Backup/restore fails

**Response Time**: < 24 hours  
**Resolution Target**: < 72 hours

### P2 - Medium (Normal)
**Impact**: Minor issue, workaround available

**Examples**:
- UI glitches
- Slow performance on edge cases
- Minor UX issues
- Cosmetic bugs

**Response Time**: < 72 hours  
**Resolution Target**: Next scheduled release

---

## Hotfix Workflow

```
┌─────────────────┐
│  Issue Reported │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Triage (P0/P1?)│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   P0/P1    P2+
    │         │
    ▼         ▼
┌─────────┐   ┌─────────────┐
│ Hotfix  │   │ Normal flow │
│ Branch  │   │ (backlog)   │
└────┬────┘   └─────────────┘
     │
     ▼
┌─────────────────┐
│ Fix + Test      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Beta Release    │
│ (1.0.x-beta.y)  │
└────────┬────────┘
         │
    48h validation
         │
         ▼
┌─────────────────┐
│ Stable Promote  │
│ (1.0.x)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Post-mortem     │
└─────────────────┘
```

---

## Step-by-Step Process

### 1. Issue Identification

**Trigger Sources**:
- User bug reports (GitHub, email, in-app feedback)
- Diagnostics exports
- Crash reports
- Internal testing

**Required Information**:
- VaultCRM version
- Operating system
- Steps to reproduce
- Error messages/screenshots
- Diagnostics ZIP (if available)

### 2. Triage

**Triage Checklist**:
- [ ] Severity assigned (P0/P1/P2)
- [ ] Area label assigned (vault/search/followups/etc.)
- [ ] Bug type assigned (crash/data/import/etc.)
- [ ] Reproducibility confirmed
- [ ] Affected versions identified
- [ ] Workaround documented (if any)

**Triage Decision**:
- **P0**: Immediate hotfix, all hands on deck
- **P1**: Hotfix within 72 hours
- **P2+**: Normal backlog prioritization

### 3. Hotfix Development

**Branch Naming**: `hotfix/issue-{number}-{short-description}`

**Example**: `hotfix/issue-42-vault-unlock-crash`

**Process**:
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/issue-42-vault-unlock-crash

# Make fix
# ... code changes ...

# Test locally
pnpm test:benchmark

# Commit with issue reference
git commit -m "fix: resolve vault unlock crash on Windows (#42)"

# Push and create PR
git push origin hotfix/issue-42-vault-unlock-crash
```

### 4. Beta Release

**Version Bump**:
```bash
# In package.json, increment patch and add beta suffix
# 1.0.0 → 1.0.1-beta.1
```

**Release Checklist**:
- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] CI/CD build passes
- [ ] Artifacts generated (Windows, macOS, Linux)
- [ ] SHA256 checksums generated
- [ ] GitHub release created (pre-release flag)
- [ ] Beta testers notified

### 5. Validation Period

**Minimum Validation**: 48 hours for P0, 72 hours for P1

**Validation Criteria**:
- [ ] No new crashes reported
- [ ] Fix confirmed by original reporter
- [ ] No regression in related features
- [ ] At least 3 beta users on the build

### 6. Stable Promotion

**Promote to Stable**:
```bash
# Remove beta suffix
# 1.0.1-beta.1 → 1.0.1

# Tag release
git tag v1.0.1
git push origin v1.0.1
```

**Stable Release Checklist**:
- [ ] Version finalized (no beta suffix)
- [ ] Release notes updated
- [ ] GitHub release created (not pre-release)
- [ ] Auto-updater verified
- [ ] Announcement sent

### 7. Post-Mortem (P0 only)

**Post-Mortem Template**:

```markdown
## Incident Post-Mortem: [Issue Title]

**Date**: YYYY-MM-DD
**Severity**: P0
**Duration**: X hours (from report to fix deployed)

### Summary
Brief description of what happened.

### Timeline
- HH:MM - Issue reported
- HH:MM - Triage completed
- HH:MM - Fix identified
- HH:MM - Beta released
- HH:MM - Stable promoted

### Root Cause
What caused the issue?

### Resolution
How was it fixed?

### Prevention
What changes will prevent this in the future?

### Lessons Learned
- What went well?
- What could be improved?
```

---

## Rollback Procedure

### When to Rollback
- Hotfix introduces new P0/P1 issue
- Fix is incorrect and causes regression
- Critical bug discovered after stable release

### Rollback Steps

**For Beta Channel**:
1. Revert the commit: `git revert <commit-hash>`
2. Bump version: `1.0.1-beta.2`
3. Release new beta build
4. Notify beta testers

**For Stable Channel**:
1. Assess if rollback is necessary (vs. forward-fix)
2. If rollback:
   - Update `latest.yml` to point to previous version
   - Push updated manifest
   - Users will be offered "downgrade" on next check
3. Communicate to users via GitHub release notes

### Manual Rollback (User)
If a user needs to rollback manually:
1. Download previous version from GitHub Releases
2. Close VaultCRM
3. Install previous version (overwrites current)
4. Re-enter master password

Note: Database format is forward-compatible, but some new features may not be available in older versions.

---

## Communication Templates

### P0 Acknowledgment
```
We've identified a critical issue affecting [description].

**Status**: Investigating
**Impact**: [What's broken]
**Workaround**: [If any]

We're working on a fix and will update within 4 hours.
```

### Beta Fix Available
```
A fix for [issue] is now available in beta channel.

**Version**: 1.0.1-beta.1
**Fix**: [Brief description]

Please update and confirm the issue is resolved.
```

### Stable Release
```
VaultCRM 1.0.1 is now available.

**Fixes**:
- [Issue description] (#issue-number)

The update will be offered automatically, or you can download from GitHub Releases.
```

---

## Emergency Contacts

| Role | Contact | Availability |
|------|---------|--------------|
| Lead Developer | dev@vaultcrm.app | 24/7 for P0 |
| Release Manager | release@vaultcrm.app | Business hours |
| Support | support@vaultcrm.app | Business hours |

---

## Appendix: Quick Reference

### Git Commands
```bash
# Create hotfix branch
git checkout -b hotfix/issue-XX-description main

# Merge hotfix to main
git checkout main
git merge --no-ff hotfix/issue-XX-description

# Tag release
git tag -a v1.0.1 -m "Hotfix: description"
git push origin v1.0.1
```

### Version Scheme
```
1.0.0          # Stable (GA)
1.0.1-beta.1   # First beta for patch
1.0.1-beta.2   # Second beta iteration
1.0.1          # Stable patch release
1.1.0-beta.1   # Feature release beta
1.1.0          # Feature release stable
```
