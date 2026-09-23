# Project Foundation

**Status**: Approved baseline  
**Created**: 2026-09-22  
**Last updated**: 2026-09-22

---

## Project intent

Build a mobile-first household web app to plan weekly meals, generate a shared grocery list, and collaboratively check off items while shopping in different stores.

The app is for a small household (primary: 2 adults, possible guests/family members) and must remain simple to operate and maintain.

## Target users and scale assumptions

- Primary users: one household with 2–6 members.
- Primary flows:
  - Friday meal planning
  - Auto/manual grocery list preparation
  - Saturday concurrent shopping by multiple users
  - Recipe lookup/use during the week
- Expected scale:
  - Low global scale (single household instance)
  - Low data volume
  - Moderate burst concurrency (2–5 active users at once)
- Availability expectation: best effort home-grade reliability.

## Constraints

- Hosting/runtime: self-hosted on NAS via Docker (primary).
- Budget/cost limits: open-source and free software stack for core functionality.
- Timeline: prioritize fast delivery and iteration ("vibe-coding" friendly).
- Team skills: TypeScript preferred.
- Compliance/security constraints: basic household-level security acceptable.
- Forbidden technologies (if any): none.

## Non-negotiables

- Fully self-hosted core app and data.
- Real-time shared grocery list updates for concurrent users.
- Mobile-first user experience.
- Installable on phone without app store publication (PWA).
- Open-source repository on GitHub.
- Scheduled backup path available (including Google Drive export workflow).

## Baseline architecture shape

Single-repository web application with managed self-hosted backend services:

- **Frontend/BFF**: Next.js (TypeScript), App Router, PWA capabilities.
- **Backend services**: self-hosted Supabase stack (Postgres, Auth, Realtime, Storage).
- **Realtime model**: database change subscriptions for grocery list and shopping-session updates.
- **Auth model**: simple household authentication flow (low-friction account model).

Architecture style: modular monolith at app layer + containerized platform services.

## Data/storage baseline

Primary database: PostgreSQL (via Supabase).

Initial logical entities:

- Household
- User
- MealPlan (week scope)
- Meal
- Recipe
- Ingredient
- GroceryList
- GroceryListItem
- Store (optional)
- ShoppingSession / ItemStatusHistory (optional for audit-lite)

Storage assumptions:

- Relational model with foreign keys and timestamps.
- Soft constraints for simplicity; strict normalization only where useful.
- Optional file storage for recipe images/attachments.

Backup baseline:

- Scheduled Postgres dumps on NAS.
- Optional automated copy to Google Drive (encrypted archive recommended).
- Restore procedure documented and tested at least once before production use.

## Testing baseline

- **Unit tests**: domain utilities, list merge logic, parsing/mapping logic.
- **Integration tests**: API/database interactions, auth flows, realtime event handling.
- **E2E tests**: mobile viewport core journey:
  1) plan meals,
  2) generate/update list,
  3) multi-user concurrent check-off behavior.
- Smoke test on every release candidate with docker-compose environment.

## Deployment baseline

- Docker Compose deployment on NAS.
- Reverse proxy termination and routing handled in NAS environment.
- Environment-based configuration via `.env` and secret management in deployment system.
- One-command local/dev startup target and one-command production compose startup target.
- Initial environments:
  - local development
  - production (NAS)

## Operational guardrails

- Keep dependency set minimal and update monthly.
- Pin critical container versions.
- Basic healthcheck endpoints and container restart policy.
- Daily automated backup + weekly backup verification.
- Document “break glass” recovery steps (service restart + DB restore).

## Initial risks

- Supabase self-hosted operational complexity vs very lightweight alternatives.
- NAS resource limitations if all services run on one host.
- Realtime edge cases under weak network conditions in stores.
- Household auth simplicity may need hardening later if user model expands.
- Backup jobs to Google Drive can silently fail without alerting.

## Non-goals

- Native iOS/Android apps at initial release.
- Enterprise-grade IAM/SSO and advanced RBAC.
- Complex offline-first conflict-free replication.
- Multi-tenant SaaS architecture.
