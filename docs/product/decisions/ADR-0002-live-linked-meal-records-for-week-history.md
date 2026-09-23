# ADR-0002: Live-linked meal records for weekly history

**Date**: 2026-09-22  
**Status**: Proposed

---

## Context

The product now introduces a reusable Meal Library with weekly plan entries referencing meals. A key behavior decision is whether historical week views should show immutable snapshots of meal data, or always reflect the latest edited meal record.

The user explicitly prefers latest edited meal data to be shown in historical weeks.

## Options considered

### Option 1: Snapshot at planning time

Store denormalized meal title/ingredients/recipe text on each week entry.

**Pros:**
- Historical accuracy to original planning moment.
- Editing a meal cannot alter past views.

**Cons:**
- Data duplication and drift.
- Harder reuse maintenance.
- More complex update logic when users actually want global correction.

### Option 2: Live-linked via foreign key (chosen)

Week entries keep FK to meal records; UI resolves latest meal data at read time.

**Pros:**
- Single source of truth for meals.
- Simplifies reuse/editing workflow.
- Immediate consistency across weeks.

**Cons:**
- Past views change when meals are edited.
- May conflict with expectations of immutable history for some users.

## Decision

Adopt **Option 2**: weekly plan entries reference meal records via FK and historical weeks display latest edited meal data.

## Consequences

Positive:
- Faster editing/reuse loop.
- Cleaner normalized schema.

Tradeoffs:
- Historical display is not immutable by design.
- UX copy/help text should clarify this behavior.

## Related

- Features: docs/product/features/meal-library-reuse-and-search.md
- Issues: TBD
