# Stack Decision

**Status**: Approved  
**Created**: 2026-09-22  
**Last updated**: 2026-09-22

---

## Decision summary

Chosen stack: **Option A — Next.js (TypeScript, PWA) + self-hosted Supabase (Postgres/Auth/Realtime) on Docker Compose**.

One-line rationale: best fit for a fully self-hosted, mobile-first, real-time household app while keeping implementation fast and TypeScript-centric.

## Options considered

### Option A: Next.js + self-hosted Supabase

**Pros**
- End-to-end TypeScript-friendly workflow.
- Realtime and auth available without building from scratch.
- PostgreSQL foundation supports future growth.
- Strong ecosystem, docs, and community support.
- Docker-friendly for NAS deployment.
- Clean path to PWA installability.

**Cons**
- Heavier runtime footprint than minimalist backends.
- More operational moving parts than single-binary solutions.

### Option B: Next.js + self-hosted Appwrite

**Pros**
- Integrated backend platform with auth/database/realtime.
- Docker deployment model is straightforward.

**Cons**
- Smaller TypeScript web ecosystem examples for this use case.
- Less alignment with Postgres-first data workflows.

### Option C: Next.js + PocketBase

**Pros**
- Very lightweight and simple to self-host.
- Fast setup and low resource usage.

**Cons**
- Lower long-term flexibility for relational complexity.
- Smaller ecosystem for production-grade patterns in this exact stack shape.

## Chosen option

### Final choice

**Option A: Next.js + self-hosted Supabase**

### Why this was chosen

Matched directly to stated constraints:

- **NAS-first Docker deployment**: Supabase and Next.js are container-native.
- **Fully self-hosted core**: no mandatory external managed services.
- **Realtime multi-user list updates**: Supabase Realtime reduces custom websocket work.
- **Mobile-first installable app**: Next.js supports PWA patterns and mobile-first UI implementation.
- **TypeScript + vibe-coding preference**: reduces backend plumbing and accelerates delivery.
- **Open-source/GitHub**: all core technologies are OSS-friendly.

## Consequences

### Positive
- Faster time-to-first-working-version.
- Lower custom infrastructure code burden.
- Good developer ergonomics for iterative feature work.
- Solid data durability and migration path via Postgres.

### Tradeoffs
- Higher baseline ops complexity than PocketBase.
- Need to monitor and patch multiple services.
- Potential NAS resource pressure if under-provisioned.

## Baseline technical selections

- Frontend: Next.js (TypeScript), App Router.
- UI: Tailwind CSS, mobile-first responsive design system.
- Installability: PWA manifest + service worker.
- Backend platform: self-hosted Supabase stack.
- Database: PostgreSQL.
- Realtime: Supabase Realtime subscriptions.
- Auth: simple household account model.
- Deployment: Docker Compose on NAS.
- CI baseline: GitHub Actions for lint/test/build.
- Backups: scheduled Postgres dump + optional encrypted copy to Google Drive.

## Follow-up decisions

- Finalize reverse proxy and domain/TLS approach for NAS exposure.
- Define minimal auth policy (shared household account vs individual lightweight accounts).
- Decide backup encryption standard and restore-test cadence.
- Decide observability minimum (logs only vs logs + basic alerting).
