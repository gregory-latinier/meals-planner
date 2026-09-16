---
description: Check that documentation is in sync with code changes — identify missing doc updates, outdated examples, and changelog gaps before merge.
---

You are running a docs-sync check on the current working changes. Use the `docs-quality` skill as your quality bar.

Do not modify any files. Surface all gaps as a structured report.

## Steps

1. Get the full diff: run `git diff main` (or `git diff origin/main`).

2. Identify all changed code paths that affect user-facing behavior:
   - Public functions, methods, classes, or modules
   - CLI commands or flags
   - Config options or environment variables
   - Error messages referenced in documentation
   - Default values that appear in docs

3. For each changed user-facing item, check:
   - Is it documented in `README.md`? Is that section still accurate?
   - Are inline comments / JSDoc / docstrings present and still accurate?
   - Do any code examples in docs use the changed API? Are they still correct?
   - Is a changelog entry present under `## [Unreleased]` for this change?

4. Check for removed items:
   - Is any removed API, flag, or option still mentioned in docs?
   - Is the removal documented in the changelog under `Removed` or `Deprecated`?

5. Produce the sync report:

```
## Docs Sync Report

### Status: [IN SYNC | GAPS FOUND | BLOCK]

### Gaps
| Item changed | Doc location | Issue |
|---|---|---|
| <function/flag/option> | <README / inline / example> | <what is missing or outdated> |

### Changelog gaps
- [ ] <change description> — no changelog entry found

### Outdated examples
- <file>:<line> — example uses old API `<old>`, should use `<new>`

### Removed but still documented
- <file>:<line> — `<item>` was removed but still appears in docs

### Recommended doc updates
1. ...
2. ...
```

A `BLOCK` verdict means docs must be updated before this PR is ready to merge.

$ARGUMENTS
