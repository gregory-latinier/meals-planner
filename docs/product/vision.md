# Product Vision

**Last updated**: 2026-09-17

## Problem

Households planning meals and groceries across scattered sources (books, websites, Instagram, notes apps) lose time and context every week. They struggle to reuse past meal decisions, rebuild ingredient lists repeatedly, and coordinate shopping in real time without sync errors.

## Target users

- Primary: small households/families that plan weekly meals together.
- Typical context: one shared household workflow, mobile-first usage during planning and shopping, occasional desktop use.
- Frustrations:
  - no convenient meal history,
  - recipe links disappearing/unavailable later,
  - repetitive ingredient gathering,
  - manual store sorting,
  - collaboration friction during parallel shopping.

## Product goal

Give households a reliable, self-hosted, multilingual meal-planning and shared grocery workflow that is faster than ad-hoc notes and trustworthy in real-time collaboration.

## Core principles

- **Reliability over novelty**: sync correctness is a hard requirement.
- **Assistive automation, human control**: extraction helps, user validates.
- **Mobile-first collaboration**: primary shopping/planning flow must work great on phones.
- **Workflow continuity**: support practical transition paths (e.g., copy list to existing tools).
- **Self-hosted simplicity**: deployment must stay approachable for home NAS users.

## Long-term goals

- Become the household source of truth for what was planned, bought, and cooked.
- Reduce weekly planning/shopping overhead through reusable meal + ingredient memory.
- Improve extraction quality and multilingual normalization while preserving user trust.
- Expand from planning/checklists into broader household food operations (as justified by usage).

## Non-goals

- Enterprise/team procurement workflows.
- Advanced health analytics as an initial priority (macros/nutrition-first positioning).
- Complex identity/invite ecosystems for early versions (shared household access first).

## Open questions

- What data model and UX best handle multilingual ingredient normalization over time?
- Which external recipe sources will require fallback mechanisms due to access/scraping constraints?
- What minimum offline/degraded behavior is required to preserve shopping trust in poor connectivity?
