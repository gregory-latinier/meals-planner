# ADR-0003: Async AI extraction workflow and shared provider configuration

**Status**: Accepted  
**Date**: 2026-09-23

---

## Context

The Meal Library feature needs AI-assisted extraction of ingredients and suggested amount per serving from recipe text and/or URL content.

Key product constraints:

- Meal creation must stay reliable and non-blocking.
- Users explicitly requested manual extraction trigger (not auto-on-save).
- Users requested Gemini as the initial provider.
- App is household/self-hosted with a simple shared-permission model for now.

## Decision

1. **Extraction execution model**: asynchronous/background job.
2. **Trigger model**: manual user action only (button-driven in MVP).
3. **Failure policy**: extraction failures do not block meal save/edit; meals remain usable and editable.
4. **Provider policy (MVP)**: Gemini-only.
5. **Configuration model**: in-app AI admin page with shared configuration available to any logged-in user.

## Alternatives considered

### A) Synchronous extraction on trigger

- Pros: simpler implementation path.
- Cons: request timeout risk, poorer UX on slow pages/providers, brittle under network variability.

### B) Auto extraction on meal save

- Pros: fewer user actions.
- Cons: hidden token/cost usage, less user control, increased surprise on failures.

### C) Async extraction (chosen)

- Pros: reliability-first, explicit status model, better resilience to latency/failures.
- Cons: requires job/status plumbing and status UI.

## Consequences

### Positive

- Better reliability for self-hosted/home-network conditions.
- Clear operational model with observable extraction lifecycle.
- User retains control over when AI spend occurs.

### Negative / tradeoffs

- More implementation complexity than synchronous flow.
- Potential eventual-consistency delay before extracted ingredients appear.

## Follow-ups

- Define extraction status taxonomy and retry UX.
- Define ingredient normalization strategy (units, aliases) in a later hardening phase.
- Revisit access control model for AI settings if multi-user trust boundaries change.
