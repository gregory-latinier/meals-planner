---
name: ticket-intake
description: Use when the user describes a feature, bug, or task in rough terms and needs it scoped into a clear, actionable work item with acceptance criteria. Trigger keywords: ticket, issue, story, task, feature request, bug report, scope this, write up, acceptance criteria.
---

# Ticket Intake

When the user describes work they want done, help them turn it into a well-scoped work item before any implementation starts. Every ticket must be GitHub-ready so it can be created as an issue and added to the kanban board immediately after confirmation.

## Steps

1. **Clarify intent** — Ask one targeted question if the request is ambiguous. Do not ask multiple questions at once.
2. **Identify type** — Feature, bug, chore, spike, or improvement.
3. **Assign metadata** — Fill in all required kanban fields (see below).
4. **Write the work item** using the GitHub-ready template below.
5. **Confirm with the user** before handing off to `maintainer-ops` for issue creation.
6. **Hand off to `maintainer-ops`** — after confirmation, instruct it to create the GitHub issue and add it to project #1 with `Status = Backlog`.

## Required Kanban Metadata

Every ticket must include these fields before it can be confirmed:

| Field | Values | Required |
|---|---|---|
| `Type` | `feature`, `bug`, `chore`, `docs`, `spike` | Yes |
| `Priority` | `P0` (critical), `P1` (high), `P2` (low) | Yes |
| `Size` | `S` (< 1 day), `M` (1–3 days), `L` (> 3 days) | Yes |
| `Target Release` | version string e.g. `v0.1.0`, or `backlog` | Yes |
| `Initial Status` | always `Backlog` | Fixed |

## GitHub-Ready Issue Template

Output every ticket in this exact format so it can be pasted directly into `gh issue create`:

```
---
title: [Short imperative title — max 10 words]
labels: type:<type>, priority:<p0|p1|p2>
---

## Context
[One paragraph: what is the current situation, why does it matter?]

## Goal
[One sentence: what should be true when this is done?]

## Acceptance Criteria
- [ ] [Specific, testable condition 1]
- [ ] [Specific, testable condition 2]
- [ ] [Specific, testable condition 3]

## Out of Scope
- [What this ticket explicitly does NOT cover]

## Notes / Open Questions
- [Any assumptions, risks, or things that need a decision]

---
**Metadata**
- Type: `<type>`
- Priority: `<P0|P1|P2>`
- Size: `<S|M|L>`
- Target Release: `<version|backlog>`
- Board status: `Backlog`
```

## Post-confirmation handoff

After the user confirms the ticket, output the following instruction for `maintainer-ops`:

```
Create a GitHub issue in gregory-latinier/meals-planner with the above title, body, and labels.
Add the issue to project https://github.com/users/gregory-latinier/projects/1.
Set Status = Backlog, Priority = <value>, Type = <value>.
```

## Guidelines

- Acceptance criteria must be testable — "it works" is not acceptable
- Keep scope tight: if a request spans more than 3 acceptance criteria naturally, suggest splitting into multiple tickets
- Flag any ambiguity in the "Notes / Open Questions" section rather than guessing
- Do not begin implementation until the user has confirmed the work item
- Do not skip the metadata fields — a ticket without kanban metadata will not be synced to the board
