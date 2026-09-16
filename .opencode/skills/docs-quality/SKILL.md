---
name: docs-quality
description: Use when reviewing or improving documentation, README files, quickstart guides, API docs, or code examples. Trigger keywords: docs, documentation, README, quickstart, examples, API docs, docstring, inline docs, docs quality, write docs, update docs.
---

# Docs Quality

This skill defines the documentation quality bar for this OSS project.

## Documentation Quality Bar

Good OSS docs must meet all of these:

### Accuracy
- [ ] Every install/setup step works end-to-end on a clean machine
- [ ] All code examples run without modification
- [ ] API docs match the current implementation (no outdated signatures)
- [ ] Config options listed in docs match what the code actually accepts

### Completeness
- [ ] README covers: what it does, install, quickstart, usage, configuration, contributing, license
- [ ] Every public API, function, or CLI command is documented
- [ ] Error messages referenced in docs match what the code actually outputs
- [ ] Known limitations and caveats are documented

### Usability
- [ ] A new user can go from zero to working example in under 5 minutes
- [ ] Quickstart is the shortest possible path — no unnecessary steps
- [ ] Examples use realistic, relatable data (not `foo`, `bar`, `test`)
- [ ] Jargon is explained or avoided; no assumed knowledge beyond stated prerequisites

### Maintenance
- [ ] Docs are updated in the same PR as any behavior change
- [ ] Outdated docs are removed, not left as dead content
- [ ] Version-specific docs are clearly labeled if applicable

## README Checklist

```
- [ ] Project name and one-line description
- [ ] CI badge, license badge, version badge
- [ ] What it does (2-3 sentences, plain language)
- [ ] Prerequisites (what must already be installed)
- [ ] Install instructions (exact commands, copy-pasteable)
- [ ] Quickstart (minimal working example, < 10 lines)
- [ ] Usage examples (2-3 realistic scenarios)
- [ ] Configuration reference (all options, their defaults, and effect)
- [ ] Contributing section or link to CONTRIBUTING.md
- [ ] License section
```

## Inline Docs Standard

For every public function, class, method, or exported value:
- One-line summary of what it does
- Parameters: name, type, description, whether optional
- Return value: type and description
- Throws/errors: what conditions cause errors and what type
- Example (for non-trivial APIs)

## Docs-Code Sync Rule

If a PR changes any of the following, docs must be updated in the same PR:
- Public function/method signature
- CLI flags or commands
- Config file schema or options
- Environment variables
- Error messages that appear in documentation
- Default values

If docs are not updated, the PR is not ready to merge.

## Docs Review Checklist (for reviewer agent)

When reviewing a PR for docs quality:

1. Does any changed behavior appear in the README, API docs, or inline comments?
2. Do all code examples in docs still work with this change?
3. Is there a changelog entry for user-facing changes?
4. Are new public APIs fully documented?
5. Are removed/deprecated APIs removed from docs or clearly marked deprecated?
