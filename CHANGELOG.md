# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Scaffolded baseline platform with Next.js (TypeScript + App Router), Tailwind mobile-first setup, PWA manifest/service worker wiring, Docker + docker-compose (app + Supabase local dependencies), initial Vitest smoke test, and GitHub Actions CI for lint/typecheck/tests.
- Implemented auth bootstrap and recovery MVP: mobile-first `/login`, first-run one-time setup token + `/setup`, local one-time reset token command + `/reset`, setup route guard after initialization, audit-lite auth event logging, and token lifecycle/auth behavior tests.

### Changed

- Standardized JavaScript package management on pnpm (package manager metadata, lockfile, docs, CI pipeline, and Docker build/runtime flow).

### Fixed

- Hardened auth flows by enforcing fail-closed behavior when auth state is unreadable after initialization, enabling setup-token regeneration after expiry without restart, and serializing token mutations to prevent parallel single-use token reuse.
