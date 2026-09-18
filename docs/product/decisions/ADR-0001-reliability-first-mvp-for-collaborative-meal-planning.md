# ADR-0001: Reliability-first MVP for collaborative meal planning

**Date**: 2026-09-17  
**Status**: Proposed

---

## Context

The product must replace a real household workflow currently handled in Google Keep, with a strict non-functional requirement: sync issues are unacceptable. The MVP also includes multi-source ingredient extraction (text/link/photo), multilingual UX and parsing, and unit conversion by user language convention.

Given this breadth, the key decision is whether v1 should optimize for automation depth or for end-to-end reliability and collaborative correctness.

## Options considered

### Option 1: Reliability-first MVP (chosen)

Focus on complete weekly planning + shared grocery collaboration with robust real-time state and mandatory ingredient validation.

**Pros:**
- Directly addresses the primary failure condition (sync issues).
- Reduces risk from extraction inaccuracies through user validation.
- Delivers replace-Google-Keep value quickly with controlled complexity.

**Cons:**
- More manual correction work remains for users when extraction is imperfect.
- Some automation “magic” deferred to later iterations.

### Option 2: Automation-first MVP

Prioritize deep auto-extraction and minimal editing flow from day one.

**Pros:**
- Potentially lower manual effort when parsing is highly accurate.
- Strong immediate wow-factor.

**Cons:**
- Higher implementation and maintenance complexity.
- Increased brittleness across heterogeneous content sources/languages.
- Greater risk of delaying reliable collaborative core behavior.

### Option 3: Staged split (core now, OCR/extraction hardening next)

Ship core collaboration first, then expand extraction quality in a subsequent release.

**Pros:**
- Fastest path to stable collaboration features.
- Lower immediate technical risk.

**Cons:**
- Photo/link extraction experience may feel incomplete in first release.
- Requires explicit expectation management for early adopters.

## Decision

Adopt **Option 1: Reliability-first MVP**.

Specifically:
- Ship the full weekly planning + live shared grocery workflow in v1.
- Include extraction from text/link/photo, but enforce user validation/edit before save.
- Treat synchronization correctness and mobile usability as release gates.
- Support EN/FR/ES/PT/DE for both UI and extraction inputs, with user-configurable unit conversion to language conventions.

## Consequences

Positive:
- The product solves the household’s core pain with low risk of trust-breaking behavior.
- User trust improves via visible validation and predictable list behavior.

Negative / tradeoffs:
- Users may still need to correct extraction frequently in early versions.
- Additional work will be needed post-v1 for extraction quality and language normalization improvements.

Operational implications:
- Testing strategy must emphasize concurrency/sync correctness.
- QA coverage must include multilingual extraction and conversion edge cases.
- Product communication should frame automation as assistive, not infallible.

## Related

- Features: docs/product/features/household-meal-planning-shared-groceries.md
- Issues: n/a
