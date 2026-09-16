---
description: Run pre-merge checks — reviewer agent + release checklist — and return a PASS/NEEDS CHANGES/BLOCK verdict before merging a PR.
---

You are running a pre-merge preflight check on the current working changes. Be thorough and do not skip any step.

1. Run `git diff main` (or `git diff origin/main`) to get the full diff of current changes.
2. Invoke the `reviewer` agent on that diff with the full OSS review checklist (correctness, edge cases, security, compatibility, tests, docs, CI readiness, contributor experience).
3. Run the pre-merge checklist from the `release-checklist` skill.
4. Run the docs quality checklist from the `docs-quality` skill for any changed user-facing behavior.
5. Aggregate all findings and return a single structured verdict:

```
## Preflight Report

### Verdict: [PASS | NEEDS CHANGES | BLOCK]

### SemVer Impact: [patch | minor | major]

### Blockers (must fix before merge)
- ...

### Warnings (should fix, or explicitly accept)
- ...

### Notes
- ...

### Changelog entry needed?
[yes — suggested line | no]
```

$ARGUMENTS
