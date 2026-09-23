# Feature Brief: Auth Bootstrap and Local Recovery

**Status**: Confirmed  
**Date**: 2026-09-22  
**Owner**: Product Discovery

---

## 1) Problem

The app needs secure initial access for NAS self-hosted installs without weak default credentials, and users need a reliable way to recover access if they forget the password.

Current risk to avoid:
- Hardcoded default credentials (`admin/admin`) are insecure.
- Password-only login without recovery can permanently lock users out.

## 2) Target user and context

- Household admin installing the app on NAS via Docker.
- Primary usage on mobile phones after setup.
- Basic home-scale security expectations (not enterprise IAM).

## 3) Goal and success criteria

### Goal

Provide a minimal, secure, self-hosted authentication experience that is easy to initialize and recover without cloud dependency.

### Success criteria

- First-run setup can be completed in under 5 minutes.
- No static default credentials exist in code/config.
- Setup token can be accessed by installer during NAS install.
- Password can be reset locally if forgotten.
- Login page is mobile-first and reliable.

## 4) Scope

### In scope (must-have)

1. **First-run setup token flow**
   - Generate one-time setup token on first startup when no admin credential exists.
   - Token has TTL (configurable; default value to be decided in implementation).
   - Token can be retrieved via installation-friendly channels:
     - container startup logs
     - optional file in mounted persistent volume

2. **Setup page** (`/setup`)
   - Token validation
   - Admin password creation
   - Password policy: basic minimum strength baseline
   - On success, invalidate token and mark system initialized

3. **Login page** (`/login`)
   - Mobile-first UX
   - Admin credential login
   - Clear error states

4. **Forgot password recovery path (local/self-hosted)**
   - Local command/API-safe operator flow to generate one-time password reset token
   - Token is short-lived and single-use
   - Reset page (`/reset`) allows setting a new password

5. **Post-setup hardening baseline**
   - Setup endpoint unavailable after successful initialization (or always requires valid one-time token)
   - Audit-lite event logging for setup and reset actions

### Nice-to-have (should not block MVP)

- Login attempt throttling / basic rate limiting
- Optional explicit switch to permanently disable setup route
- Copy-friendly token UX helper in docs/UI

### Out of scope

- Multi-user roles/permissions
- OAuth/SSO/2FA
- Email-based password reset
- Full security hardening/monitoring suite

## 5) User journeys

### Journey A: First install
1. Admin deploys containers on NAS.
2. App starts, generates setup token, prints retrieval instructions.
3. Admin opens `/setup` on phone or desktop.
4. Admin submits token + new password.
5. App confirms success; `/login` becomes primary entry.

### Journey B: Normal login
1. User opens app on mobile.
2. User authenticates at `/login`.
3. Session is created and user enters app.

### Journey C: Forgot password
1. User cannot log in.
2. Admin runs local recovery command on NAS.
3. System returns one-time reset token.
4. User opens `/reset`, enters token, sets new password.
5. Old password invalid, new login works.

## 6) Failure conditions (explicitly captured)

Feature is considered a failure if:
- User forgets password and cannot reset locally.
- Setup token cannot be found easily during install.
- Setup flow is confusing or fails on mobile.

## 7) Constraints and assumptions

- Fully self-hosted core (no mandatory cloud dependencies).
- NAS-first Docker deployment.
- Household-level security profile (basic/moderate controls, not enterprise).
- Primary implementation stack remains TypeScript + Next.js + self-hosted Supabase baseline.

## 8) Risks and mitigations

- **Risk**: Token leakage through logs.  
  **Mitigation**: short TTL, single-use, clear instruction to rotate immediately, optional file permissions guidance.

- **Risk**: Recovery flow abused by anyone with host access.  
  **Mitigation**: document that host shell access equals admin trust boundary; keep reset tokens short-lived and one-time.

- **Risk**: Lockout through expired token during setup.  
  **Mitigation**: provide local command to regenerate setup token while uninitialized.

## 9) MVP acceptance criteria

- [ ] On fresh install, app exposes a one-time setup token and setup instructions.
- [ ] `/setup` accepts valid token and creates admin password.
- [ ] Setup token is invalid after successful setup.
- [ ] `/login` works on mobile viewport for valid credentials.
- [ ] Local recovery command creates one-time reset token.
- [ ] `/reset` accepts token and updates password.
- [ ] Old password no longer works after reset.
- [ ] Core setup/reset events are logged.

## 10) Open implementation decisions (for orchestrator/engineering)

- Exact token TTL defaults for setup and reset.
- Password policy thresholds (minimum length, optional complexity).
- Preferred local recovery interface (CLI command vs admin endpoint bound to localhost).
- Session duration and remember-me behavior.
