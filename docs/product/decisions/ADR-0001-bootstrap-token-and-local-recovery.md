# ADR-0001: Bootstrap via One-Time Setup Token with Local Password Recovery

**Status**: Accepted  
**Date**: 2026-09-22

---

## Context

The project is a self-hosted household web app running on NAS. Initial discussion considered fixed default credentials, but this creates obvious security risk. The product also requires a reliable password recovery method without cloud/email dependency.

## Decision

Adopt a two-part auth bootstrap model:

1. **First-run one-time setup token** for initial admin password creation.
2. **Local one-time reset token** flow for forgotten password recovery.

Both tokens are short-lived and single-use.

## Why this decision

- Removes insecure hardcoded default credentials.
- Preserves easy NAS installation experience.
- Maintains fully self-hosted operation.
- Addresses explicit user failure concern: being locked out with no reset path.

## Consequences

### Positive
- Better default security posture for initial access.
- Clear and practical recovery mechanism for household admins.
- No mandatory third-party services.

### Tradeoffs
- Slightly more complexity than static credentials.
- Token exposure risk in logs if host environment is poorly secured.
- Recovery depends on trusted access to NAS host.

## Guardrails

- Setup/reset tokens must have TTL and single-use semantics.
- Setup must be disabled or strongly guarded after initialization.
- Recovery actions should be event-logged.

## Revisit triggers

- Multi-user model and roles introduced.
- App exposed publicly beyond trusted home network.
- Security posture requirement increased (e.g., 2FA or SSO needed).
