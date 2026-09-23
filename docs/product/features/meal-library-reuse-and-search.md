# Feature: Meal library reuse and search in weekly planning

**Status**: Draft  
**Created**: 2026-09-22  
**Last updated**: 2026-09-22  
**Target release**: v0.1.0

---

## Problem

Weekly planning is slower than it should be because users cannot quickly reuse previously added meals from a searchable library. Meal data (recipe + ingredients) also needs one editable source of truth.

## Goal

Enable users to search and reuse meals directly during weekly planning, while managing meals in a dedicated editable Meal Library.

## Success criteria

- [ ] In weekly planning, users can search existing meals and add a selected meal directly to Unassigned.
- [ ] Users can browse/search a dedicated Meal Library by title and ingredient text.
- [ ] Meal Library defaults to alphabetical sorting.
- [ ] Users can edit meal title, recipe content/source, and ingredients in the Meal Library.
- [ ] Weekly planned entries reference meal records via foreign key and reflect latest edited meal data.

## Scope

### In scope
- Add meal search input in weekly planning UI.
- Add-to-week action from search results that inserts selected meal directly into current week Unassigned.
- Allow duplicate additions of the same meal in a week.
- Create dedicated Meal Library page for browse/search/edit.
- Search fields: meal title + ingredient text.
- Default sort: alphabetical.
- Meal record includes:
  - title,
  - ingredient list,
  - recipe/source content (auto-extracted from link when available, or manually entered/edited).
- Data model change (clean slate allowed): weekly planned entries reference meal records with foreign keys.
- Past planned weeks show latest edited meal data via live linkage.

### Out of scope
- Extraction quality hardening initiative (tracked separately after 10 real imports).
- Backward-compatible migration strategy for already-published data (explicitly not required now).
- Nutrition, pantry, budget features.

## Approach

Build a central Meal Library as the canonical meal entity and link week plans to this entity via foreign keys. Treat weekly planning entries as schedule instances (with optional day assignment) pointing to reusable meal records.

Significant data behavior decision (live-linked historical display) is captured in ADR-0002.

## Acceptance criteria

- [ ] Weekly plan screen includes meal search input and result list.
- [ ] Selecting a meal from search adds it to current week Unassigned.
- [ ] Same meal can be added multiple times to the same week.
- [ ] Meal Library page exists and is reachable from primary navigation.
- [ ] Meal Library supports title + ingredient search.
- [ ] Meal Library default ordering is alphabetical.
- [ ] Users can edit meal title, recipe/source content, and ingredients in Meal Library.
- [ ] Weekly plan entries persist a foreign key reference to meal records.
- [ ] Editing meal data updates historical week displays (latest value shown).

## Risks / open questions

- Live-linked history can surprise users expecting immutable historical snapshots.
- Ingredient text search quality depends on normalization strategy.
- Recipe extraction variability still exists until extraction hardening phase.

## Related

- Issues: TBD
- ADRs: ADR-0002
- Research: TBD
