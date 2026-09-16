---
name: github-maintainer
description: Use when managing GitHub issues, pull requests, labels, milestones, release tagging, or maintainer workflows. Trigger keywords: triage, labels, milestones, stale, review queue, release tag, close issue, assign, GitHub workflow, maintainer.
---

# GitHub Maintainer

This skill defines the maintainer workflow for this OSS project on GitHub.

## Label Taxonomy

Apply consistent labels to all issues and PRs. Create these labels in the repo if they don't exist.

### Type
| Label | Color | Use |
|---|---|---|
| `type: bug` | `#d73a4a` | Something is broken |
| `type: feature` | `#0075ca` | New capability requested |
| `type: docs` | `#0075ca` | Documentation only |
| `type: chore` | `#e4e669` | Maintenance, deps, tooling |
| `type: question` | `#d876e3` | Not a bug or feature |

### Status
| Label | Color | Use |
|---|---|---|
| `status: needs-triage` | `#ededed` | Not yet reviewed by maintainer |
| `status: confirmed` | `#0e8a16` | Confirmed valid issue |
| `status: in-progress` | `#fbca04` | Actively being worked on |
| `status: blocked` | `#b60205` | Blocked on decision or dependency |
| `status: wont-fix` | `#ededed` | Intentionally not addressing |

### Priority
| Label | Color | Use |
|---|---|---|
| `priority: critical` | `#b60205` | Blocking users, needs immediate fix |
| `priority: high` | `#e99695` | Important, next sprint |
| `priority: low` | `#c5def5` | Nice to have |

### Contributor
| Label | Color | Use |
|---|---|---|
| `good first issue` | `#7057ff` | Good for new contributors |
| `help wanted` | `#008672` | Maintainer wants community help |

## Issue Triage SOP

When a new issue arrives:

1. Read the issue — is it a bug, feature, question, or duplicate?
2. Apply `status: needs-triage` if not already labeled
3. If duplicate: close with link to original + `status: wont-fix`
4. If question: answer or redirect to docs + close
5. If bug: reproduce or ask for reproduction steps, apply `type: bug` + `status: confirmed`
6. If feature: assess fit with project goals, apply `type: feature`, comment with initial assessment
7. Assign `priority` label based on impact
8. Assign `good first issue` if a new contributor could reasonably tackle it

## PR Review Flow

1. CI must be green before review
2. Check PR has a description and links to an issue (`Closes #N`)
3. Review using the `reviewer` agent (code quality, compatibility, security, docs, tests)
4. Request changes or approve
5. Squash merge with a clean commit message
6. Close linked issue automatically via `Closes #N`

## Milestone Strategy

- Create a milestone per planned release (e.g., `v1.0.0`, `v1.1.0`)
- Assign issues and PRs to the target milestone when confirmed + scheduled
- Close the milestone when the release is tagged

## Stale Policy

Issues and PRs inactive for 60 days:
- Add `status: stale` label and comment asking for update
- Close after 14 more days of inactivity with a friendly message
- Reopen if activity resumes

## Release Tagging Flow

1. Ensure `CHANGELOG.md` `## [Unreleased]` is complete
2. Determine SemVer bump (patch/minor/major)
3. Rename `[Unreleased]` → `[x.y.z] - YYYY-MM-DD` in `CHANGELOG.md`
4. Add new empty `## [Unreleased]` section
5. Commit: `chore(release): bump version to x.y.z`
6. Tag: `git tag -a vx.y.z -m "Release x.y.z"`
7. Push tag: `git push origin vx.y.z`
8. Create GitHub release: `gh release create vx.y.z --notes-from-tag`
9. Announce in relevant channels if applicable
