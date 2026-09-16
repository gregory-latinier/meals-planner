---
name: repo-conventions
description: Use when setting up a new project, onboarding to an existing codebase, or when the user asks about coding standards, naming conventions, commit message format, PR process, or project structure. Trigger keywords: conventions, standards, naming, style guide, commit format, PR template, project structure, how do we name.
---

# Repo Conventions

This skill defines the working conventions for this open-source project. Update this file as conventions evolve.

## File and Folder Naming

- Use `kebab-case` for files and directories (e.g., `meal-planner.ts`, `user-settings/`)
- Use `PascalCase` for React components and class files (e.g., `MealCard.tsx`)
- Use `camelCase` for variables, functions, and module-level constants
- Use `SCREAMING_SNAKE_CASE` for environment variable names and top-level config constants

## Code Style

- Prefer explicit over implicit: name things clearly even if verbose
- Keep functions small and single-purpose; if a function needs a comment to explain what it does, rename or split it
- Avoid deeply nested conditionals — use early returns and guard clauses
- No unused imports, dead code, or commented-out blocks in committed code
- Error messages must be actionable: tell users what went wrong and how to fix it

## Commit Messages

Format: `<type>(<scope>): <short description>`

Types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`

Examples:
- `feat(meals): add weekly meal plan generation`
- `fix(auth): handle expired token refresh correctly`
- `chore(deps): bump typescript to 5.4`
- `docs(readme): add quickstart section`

Rules:
- Subject line: max 72 characters, imperative mood ("add" not "adds" or "added")
- Body: optional, wrap at 72 characters, explain *why* not *what*
- Breaking changes: add `BREAKING CHANGE:` in the commit body

## Pull Requests

- PR title follows the same format as commit messages
- Every PR must have a description explaining what changed and why
- Link to the related issue in the description (`Closes #123`)
- At least one maintainer approval required before merge
- Squash merge preferred; rebase acceptable for clean linear history
- CI must be green before merge — no exceptions

## Branch Naming

Format: `<type>/<short-description>` (e.g., `feat/meal-recommendations`, `fix/login-redirect`)

Main branches:
- `main` — stable, always releasable
- `feat/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance, deps, tooling
- `docs/*` — documentation only

## Versioning Policy (SemVer)

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

- `PATCH` (x.x.+1): backward-compatible bug fixes
- `MINOR` (x.+1.0): new backward-compatible features
- `MAJOR` (+1.0.0): breaking changes — requires explicit decision and migration guide

Rules:
- Never make breaking changes in a patch or minor release
- Deprecate before removing: mark as deprecated for at least one minor release before removal
- Every release must have a corresponding entry in `CHANGELOG.md`

## Deprecation Policy

When removing or changing a public API, interface, config option, or behavior:

1. Add a deprecation warning in the current minor release (log/comment/annotation)
2. Document the migration path in `CHANGELOG.md` and relevant docs
3. Remove in the next major version only

## Changelog Policy (Keep a Changelog)

Format follows [keepachangelog.com](https://keepachangelog.com/):

```markdown
## [Unreleased]

### Added
- New features

### Changed
- Changes to existing functionality

### Deprecated
- Features marked for removal

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security fixes
```

Rules:
- Every PR that changes user-facing behavior must add a line under `## [Unreleased]`
- Use plain language — write for end users, not developers
- On release: rename `[Unreleased]` to `[x.y.z] - YYYY-MM-DD` and add a new empty `[Unreleased]` section

## Testing

- Test files live next to the source file: `meal-planner.ts` → `meal-planner.test.ts`
- Test names describe behavior: `it('returns empty list when no meals match filters')`
- Do not test implementation details — test observable behavior
- CI must pass before merge

## Required Repo Files

Every OSS release must have these files at the repo root:
- `README.md` — install, quickstart, usage, license badge
- `LICENSE` — MIT
- `CONTRIBUTING.md` — how to contribute, dev setup, PR process
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — how to report vulnerabilities
- `CHANGELOG.md` — Keep a Changelog format
