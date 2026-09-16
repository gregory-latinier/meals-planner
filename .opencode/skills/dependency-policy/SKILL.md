---
name: dependency-policy
description: Use when adding, removing, or updating dependencies, or when reviewing a PR that changes dependencies. Trigger keywords: dependency, dependencies, package, npm, install, require, import new library, add package, update package, lockfile, supply chain.
---

# Dependency Policy

This skill defines the rules for accepting, adding, and maintaining dependencies in this OSS project.

## License Allowlist

Only dependencies with the following licenses are accepted without review:

| License | Allowed |
|---|---|
| MIT | Yes |
| Apache-2.0 | Yes |
| BSD-2-Clause | Yes |
| BSD-3-Clause | Yes |
| ISC | Yes |
| CC0-1.0 | Yes |
| GPL-2.0 / GPL-3.0 | Requires maintainer review — copyleft may affect project license |
| LGPL | Requires maintainer review |
| AGPL | Not allowed without explicit decision |
| Proprietary / Unknown | Not allowed |

## Acceptance Criteria for New Dependencies

Before adding any dependency, verify all of the following:

### Necessity
- [ ] Is this functionality available in the standard library or existing dependencies?
- [ ] Is the dependency solving a real, non-trivial problem?
- [ ] Could this be implemented in < 50 lines without a dependency?

### Quality
- [ ] Last published: within 12 months (or project is intentionally stable/complete)
- [ ] Open issues/PRs: no critical unaddressed bugs
- [ ] Downloads/adoption: widely used in the ecosystem (not obscure)
- [ ] Maintainer(s): identifiable, responsive, not a single abandoned account
- [ ] Repository: source is public and auditable

### Size and scope
- [ ] Does not pull in an excessive transitive dependency tree
- [ ] Bundle size impact is acceptable for the project type

### Security
- [ ] No known CVEs at time of adoption (check `npm audit`, `pip audit`, etc.)
- [ ] Not on any known supply-chain compromise lists

## Justification Template

When proposing a new dependency in a PR, include:

```
## New Dependency: <package-name>@<version>

### Why needed
[What problem does it solve? Why not implement it ourselves?]

### License
[License name]

### Maintenance status
[Last release date, weekly downloads, maintainer info]

### Alternatives considered
[What else was evaluated and why this was chosen]

### Bundle / install size impact
[Approximate size added]
```

## Update Policy

- **Patch updates**: apply freely, no review needed
- **Minor updates**: apply with a quick changelog scan for unexpected behavior changes
- **Major updates**: treat as a potential breaking change — read the migration guide, test thoroughly, document in changelog
- **Security updates**: apply immediately regardless of version bump, follow `security-response` skill

## Lockfile Policy

- Always commit the lockfile (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, etc.)
- Lockfile changes in a PR must be explainable by the dependency changes in that PR
- Unexpected lockfile changes (unrelated package updates) are a BLOCK in review
