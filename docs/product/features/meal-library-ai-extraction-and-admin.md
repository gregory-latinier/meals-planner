# Feature: Meal library with AI-assisted ingredient extraction and AI admin

**Status**: Confirmed discovery scope  
**Created**: 2026-09-23  
**Last updated**: 2026-09-23  
**Target release**: v0.1.x

---

## Problem

Meal capture and reuse are still too manual. Users need a reliable meal list where they can quickly find meals and optionally enrich them with structured ingredient data (including suggested amount per serving) to support later grocery planning.

## Goal

Deliver a Meal Library page that supports search/sort/view preferences and a controlled AI extraction workflow (manual trigger) that enriches meal records without blocking save operations.

## Scope

### In scope (MVP)

- Meal Library page with:
  - Search by meal **name** and **ingredient text**
  - Sort by:
    - Name (A→Z / Z→A)
    - Created date (newest / oldest)
    - Last updated date (recently edited first)
  - View mode toggle: **Grid** and **Table**
  - Persisted last-selected view mode
- Meal fields:
  - Name
  - Recipe
  - URL
  - Photo
- Meal creation/editing:
  - Paste raw recipe text directly
  - Optional URL entry
- AI extraction:
  - Triggered manually via explicit user action (e.g., “Extract ingredients”)
  - If URL exists, app attempts recipe extraction from URL first
  - Provider for MVP: **Gemini**
  - Output includes ingredient list and suggested amount per serving
  - Async/background processing model (non-blocking)
  - On extraction failure, meal remains saved and editable with extraction status surfaced
- AI admin page:
  - Accessible to any logged-in user (household-wide admin model for now)
  - Configure provider token(s)
  - Configure/select available models
  - Select active model used for extraction

### Out of scope

- OCR from meal photos
- Full reliability guarantees for Instagram-specific extraction edge cases
- Nutrition/macros computation
- Advanced duplicate detection/classification
- Role-based access controls for AI settings (single household permission model for now)

## Success criteria

- [ ] Users can create and edit meals with Name, Recipe, URL, and Photo.
- [ ] Users can search the meal library by name and ingredient text.
- [ ] Users can sort by name, created date, and updated date.
- [ ] Users can switch Grid/Table view and see their preference persisted.
- [ ] Users can manually trigger AI extraction for a meal.
- [ ] Extraction runs asynchronously and surfaces status (pending/running/success/failed).
- [ ] Failed extraction does not block meal save or edit.
- [ ] Successful extraction stores ingredients and per-serving suggested amounts.
- [ ] Logged-in users can configure Gemini token and model selection on the AI admin page.

## UX notes

- Default behavior prioritizes reliability and user control over automation.
- “Manual trigger” avoids hidden token/cost usage and makes extraction intent explicit.
- Failure path must be clear and non-destructive (keep user-entered recipe/URL intact).

## Technical direction (product-level)

- Use asynchronous extraction jobs instead of synchronous request/response extraction.
- Keep meal capture independent from extraction success.
- Treat AI configuration as environment-level app configuration managed via in-app admin screen.

## Risks / open questions

- URL extraction quality can vary by source site structure and anti-bot protections.
- AI output consistency (units, ingredient normalization) may need a later hardening pass.
- Multi-user editing conflicts on the same meal may require explicit conflict handling if observed.

## Related

- ADR: `docs/product/decisions/ADR-0003-async-ai-extraction-and-shared-provider-config.md`
- Prior feature context: `docs/product/features/meal-library-reuse-and-search.md`
