# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Scaffolded baseline platform with Next.js (TypeScript + App Router), Tailwind mobile-first setup, PWA manifest/service worker wiring, Docker + docker-compose (app + Supabase local dependencies), initial Vitest smoke test, and GitHub Actions CI for lint/typecheck/tests.
- Implemented auth bootstrap and recovery MVP: mobile-first `/login`, first-run one-time setup token + `/setup`, local one-time reset token command + `/reset`, setup route guard after initialization, audit-lite auth event logging, and token lifecycle/auth behavior tests.
- Implemented Meal Library MVP with local file persistence (`.data/meal-library.json`), create/edit/search/sort UX, grid/table preference persistence, async extraction job lifecycle (`pending/running/success/failed`), Gemini-backed extraction with graceful no-token failure, shared `/admin/ai` settings, and coverage for sorting/search/status/action behavior.

### Changed

- Standardized JavaScript package management on pnpm (package manager metadata, lockfile, docs, CI pipeline, and Docker build/runtime flow).
- Added auth gating for `/library` and `/admin/ai` so unauthenticated users are redirected before protected pages render.
- Updated URL-first meal extraction to support DNS hostnames again while preserving SSRF safety via connect-time DNS/IP filtering and graceful fallback to stored `meal.recipe` when blocked or unavailable.

### Fixed

- Hardened auth flows by enforcing fail-closed behavior when auth state is unreadable after initialization, enabling setup-token regeneration after expiry without restart, and serializing token mutations to prevent parallel single-use token reuse.
- Removed Gemini API token exposure from the admin AI UI so existing tokens are never returned to the browser.
- Hardened recipe URL fetching against SSRF by allowing only HTTP(S), blocking localhost/private/link-local/metadata hosts and resolved IP targets (including IPv6 link-local `/10`), and rejecting redirects.
