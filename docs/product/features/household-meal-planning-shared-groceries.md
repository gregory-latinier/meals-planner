# Feature: Household meal planning and shared groceries

**Status**: Draft  
**Created**: 2026-09-17  
**Last updated**: 2026-09-17  
**Target release**: v0.1.0

---

## Problem

The household currently plans weekly meals and shopping in Google Keep, with recipe sources spread across books, websites, and Instagram. This creates friction:
- meal history is hard to browse, so repetition/discovery is inefficient,
- ingredient collection is manual each time,
- source links can become unavailable,
- collaborative shopping can desync when multiple people shop in parallel.

## Goal

Provide a self-hosted, mobile-first web app for one household to collaboratively plan weekly meals and maintain a live, store-grouped grocery checklist with multilingual extraction and editable validation.

## Success criteria

- [ ] Household can replace Google Keep for weekly planning + grocery execution.
- [ ] Multiple users can update meal and grocery lists concurrently without sync loss/conflicts in normal usage.
- [ ] Users can create meals from raw text, links, and photos, then validate extracted ingredients before save.
- [ ] Users can browse meal history in a calendar view and quickly find prior meals.
- [ ] UI is available in EN/FR/ES/PT/DE, and ingredient/measure output can follow user language conventions (including unit conversion option).

## Scope

### In scope
- Weekly meal list creation with optional day assignment.
- Meal carry-over/reporting to next week when meals were not completed.
- Meal input methods:
  - raw recipe text paste,
  - web/Instagram link,
  - photo capture/upload (OCR).
- Ingredient + quantity extraction from each input method.
- Mandatory validation/edit step before meal save.
- Grocery list generation from selected meals.
- Grocery checklist with picked/unpicked state.
- Store admin CRUD (household-defined stores).
- Automatic ingredient placement to store based on grocery history.
- Unknown ingredients placed in unsorted/bottom section for manual sorting.
- Shared real-time updates for multiple concurrent users.
- Copy button to export grocery list text for Google Keep transition.
- Multilingual support (EN/FR/ES/PT/DE):
  - localized UI,
  - ingredient extraction/parsing across those languages,
  - user option to convert units to their language conventions.
- Self-hosted Docker deployment for NAS and installable mobile web experience.

### Out of scope
- Per-user accounts/invite flows (shared household access is sufficient in v1).
- Features not explicitly requested (e.g., nutrition/macros, pantry inventory, allergy management, budget optimization).

## Approach

Reliability-first MVP:
- prioritize real-time consistency and collaborative correctness over aggressive automation,
- treat extraction as assistive and always user-validated,
- ship complete household workflow end-to-end before advanced intelligence.

Alternative approaches considered are documented in ADR-0001.

## Acceptance criteria

- [ ] A household can create a week plan with at least 7 meals and assign days optionally.
- [ ] A meal can be created from raw text, link, or photo and reaches a validation screen before save.
- [ ] User edits to extracted ingredients/quantities are persisted and reused for future meal occurrences.
- [ ] Grocery list groups ingredients by store, with unmatched items in an unsorted/bottom group.
- [ ] Store CRUD allows add/edit/delete and influences grouping behavior.
- [ ] Grocery item checkbox state updates live across multiple active clients.
- [ ] Meal plan changes update live across multiple active clients.
- [ ] Calendar history displays previously planned meals by week/day.
- [ ] Uncompleted meals can be moved/carried to a subsequent week.
- [ ] Copy action produces a Keep-friendly plain-text grocery list.
- [ ] UI language can be switched among EN/FR/ES/PT/DE.
- [ ] User can enable unit conversion to language conventions (e.g., English recipe to French conventions).
- [ ] App is deployable via Docker on NAS and installable on mobile from a link.

## Risks / open questions

- Extraction quality variance across websites/Instagram content layouts and OCR quality.
- Ingredient normalization across languages (synonyms/plurals) may affect store-history matching.
- Unit conversion edge cases (non-convertible or ambiguous measures like “1 cup chopped”).
- Real-time sync behavior under unstable network and concurrent edits requires strict conflict handling.
- Legal/technical limitations on scraping certain recipe sources may require graceful fallback.

## Related

- Issues: n/a
- ADRs: ADR-0001
- Research: n/a
