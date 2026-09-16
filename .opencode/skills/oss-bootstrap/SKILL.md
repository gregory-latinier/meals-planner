---
name: oss-bootstrap
description: Use when setting up a new open source project, initializing a GitHub repo, or when the user says "bootstrap", "open source setup", "github setup", "initialize repo", "create OSS project". Guides creation of all required OSS repo files and GitHub configuration.
---

# OSS Bootstrap

Use this skill when starting a new open-source project or when an existing repo is missing OSS essentials.

## Required File Matrix

Every OSS project on GitHub must have these files. Check for gaps before starting implementation.

| File | Purpose | Required |
|---|---|---|
| `README.md` | Install, quickstart, usage, badges | Yes |
| `LICENSE` | MIT license text | Yes |
| `CONTRIBUTING.md` | How to contribute, dev setup, PR process | Yes |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 | Yes |
| `SECURITY.md` | Vulnerability reporting process | Yes |
| `CHANGELOG.md` | Keep a Changelog format | Yes |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR checklist for contributors | Yes |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Structured bug reports | Yes |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Structured feature requests | Yes |
| `.github/workflows/ci.yml` | Automated CI (lint, test, typecheck) | Yes |
| `.github/CODEOWNERS` | Auto-assign reviewers | Recommended |
| `.gitignore` | Ignore build artifacts, env files | Yes |

## README Structure

A good OSS README must have:

1. **Project name + one-line description**
2. **Badges**: CI status, license, version
3. **What it does** (2–3 sentences, no jargon)
4. **Quickstart**: minimal install + first working example (< 5 lines)
5. **Usage**: common use cases with code examples
6. **Configuration** (if applicable)
7. **Contributing** link
8. **License** section

## CHANGELOG Initial Structure

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

## CI Checklist (stack-agnostic)

A minimal CI workflow should run on every push and PR to `main`:
- Lint
- Typecheck (if typed language)
- Unit tests
- Build (verify it compiles/bundles)

## First Release Readiness Checklist

Before tagging `v0.1.0`:
- [ ] All required files exist and are filled in (not placeholder text)
- [ ] README quickstart works end-to-end
- [ ] CI is green
- [ ] License year and author name are correct
- [ ] `.gitignore` covers build output, env files, editor files
- [ ] No secrets, credentials, or personal data in any file
- [ ] CHANGELOG has an `## [Unreleased]` section ready

## Bootstrap Steps (when user asks to set up repo)

1. Audit existing files against the required matrix above
2. Generate missing files using project-specific details (name, description, author)
3. Scaffold `.github/` templates and CI workflow
4. Verify README quickstart is accurate
5. Confirm first release checklist passes
6. Suggest `gh repo create` command if repo not yet on GitHub
