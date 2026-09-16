---
name: community-triage
description: Use when triaging GitHub issues or PRs, responding to community members, routing contributors, managing stale content, or writing first-response messages. Trigger keywords: triage, community, issue response, first response, stale, duplicate, newcomer, contributor, good first issue, help wanted, close issue, respond to issue.
---

# Community Triage

This skill defines the community management and issue triage process for this OSS project.

## First Response Templates

Use these as a base — always personalize with the issue/PR title and the reporter's name.

### Bug report — needs more info
```
Hi @<username>, thanks for the report!

To help us investigate, could you provide:
- Steps to reproduce (minimal example if possible)
- Expected behavior vs. actual behavior
- Version you're using and your environment (OS, runtime version)

We'll take a look once we have a reproducible case.
```

### Feature request — acknowledged
```
Hi @<username>, thanks for the suggestion!

This is interesting — we've logged it for consideration. A few questions to help us evaluate:
- What problem does this solve for you?
- Have you found any workarounds in the meantime?

We'll update this issue when we have a decision on prioritization.
```

### Duplicate issue
```
Hi @<username>, thanks for reporting!

This appears to be a duplicate of #<issue-number>. I'm closing this and continuing the discussion there — feel free to add any new details or context in that thread.
```

### Question (should be a discussion/docs)
```
Hi @<username>! This looks like a usage question rather than a bug or feature request.

<answer if short, OR:> For questions like this, [our docs](<link>) cover this in detail. If the docs are unclear, we'd love a PR to improve them!

I'm closing this issue but feel free to open a GitHub Discussion if you'd like to continue the conversation.
```

### Stale issue
```
Hi there! This issue has been inactive for 60 days. We're marking it as stale to keep the tracker clean.

If this is still relevant, please leave a comment and we'll reopen/reprioritize. Otherwise, it will be closed in 14 days.
```

## Triage Decision Tree

```
New issue arrives
│
├── Is it a duplicate?
│   └── Yes → close with link to original, apply `status: wont-fix`
│
├── Is it a question?
│   └── Yes → answer or redirect to docs, close, suggest Discussions
│
├── Is it a bug?
│   ├── Can reproduce → apply `type: bug` + `status: confirmed` + priority
│   └── Can't reproduce → ask for reproduction steps
│
├── Is it a feature request?
│   ├── Fits project goals → apply `type: feature` + priority, comment with assessment
│   └── Out of scope → close with explanation, apply `status: wont-fix`
│
└── Apply `good first issue` if:
    - Fix is well-scoped and < 1 day of work
    - Sufficient context exists to start without asking questions
    - No deep domain knowledge required
```

## Newcomer Routing

When tagging `good first issue`:
- Add a comment explaining exactly where to look in the code
- Describe the expected outcome clearly
- Link to relevant docs or prior PRs as examples
- Offer to answer questions

## Stale Policy

| Item | Stale after | Close after stale |
|---|---|---|
| Issue (no activity) | 60 days | 14 days |
| PR (no activity) | 30 days | 14 days |
| PR (waiting on author) | 14 days | 14 days |

Exceptions: issues tagged `priority: critical`, `priority: high`, or `help wanted` are never auto-closed as stale.

## Tone Guidelines

- Always thank the reporter/contributor first
- Be specific — reference the issue title or PR contents
- Be kind but direct — do not leave ambiguous non-decisions
- Close issues cleanly — an issue with a clear close reason is better than one left open forever
- Acknowledge valid frustrations without being defensive
