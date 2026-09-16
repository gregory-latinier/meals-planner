---
name: release-checklist
description: Use ONLY when preparing to merge, tag, or release code — or when the user says "ready to merge", "ship this", "release", "pre-merge check", "cut a release". Do not use for general development questions.
---

# Release Checklist

Run through this checklist before merging a PR or cutting a release. Any BLOCK item must be resolved first.

## Pre-Merge Checklist

### Code Quality
- [ ] All CI checks pass (lint, typecheck, build)
- [ ] No TODO or FIXME comments introduced in this PR (or each is tracked in a follow-up ticket)
- [ ] No console.log, debug statements, or test artifacts left in production code
- [ ] No secrets, API keys, or credentials committed (check `.env` files, config, and test fixtures)

### Tests
- [ ] New or modified behavior has test coverage
- [ ] All existing tests pass
- [ ] No tests skipped or marked `only` without explanation

### Review
- [ ] At least one reviewer has approved
- [ ] All review comments are resolved or explicitly deferred with a ticket
- [ ] The PR description explains what changed and why

### Dependencies
- [ ] Any new dependencies are intentional, documented, and have acceptable licenses
- [ ] `package-lock.json` / `yarn.lock` / equivalent is committed and up-to-date

---

## Pre-Release Checklist (in addition to above)

### Versioning
- [ ] Version bumped correctly (semver: patch/minor/major)
- [ ] Changelog / release notes updated with user-facing changes

### Configuration
- [ ] Environment variables documented for any new config required
- [ ] Feature flags toggled correctly for the target environment

### Database / Data
- [ ] Migrations are reversible (or rollback plan is documented)
- [ ] No breaking schema changes without a migration path

### Deployment
- [ ] Deployment runbook / steps documented if this release requires manual steps
- [ ] Rollback procedure known and documented

---

## Severity Definitions

- **BLOCK** — Must be resolved before merge/release
- **WARN** — Should be resolved; proceed only with explicit acceptance by the team
- **NOTE** — Informational; no action required but worth tracking
