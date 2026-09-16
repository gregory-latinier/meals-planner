---
description: Gate a breaking change — enforce migration guide, deprecation notice, SemVer major bump confirmation, and changelog entry before proceeding.
---

You are enforcing the breaking change gate for this OSS project. A breaking change requires explicit preparation before implementation. Do not proceed to code changes until all steps are complete.

Follow the `repo-conventions` skill versioning policy throughout.

## Steps

1. **Identify the break** — describe exactly what is changing and why it is breaking:
   - What public API, CLI flag, config option, event, or contract is being removed or changed?
   - Who is affected (all users / specific configurations / specific integrations)?
   - Is this break necessary, or can backward compatibility be preserved?

2. **Confirm major version bump** — ask the user to explicitly confirm:
   ```
   This is a MAJOR version bump (vX.Y.Z → v(X+1).0.0).
   Current version: <current>
   New version: <proposed>
   Confirm? [yes/no]
   ```
   Do not proceed without explicit confirmation.

3. **Write the deprecation notice** — if the old behavior was available in a previous version:
   - What should users do instead?
   - Since which version was the old behavior deprecated (or is this a surprise break)?
   - If it was not previously deprecated, flag this as a gap and recommend adding a deprecation in a minor release first.

4. **Write the migration guide** — produce a clear, copy-pasteable migration document:
   ```markdown
   ## Migrating from vX to v(X+1)

   ### <Breaking change title>

   **Before (vX):**
   ```<code example of old usage>```

   **After (v(X+1)):**
   ```<code example of new usage>```

   **Why:** <one sentence reason>
   ```

5. **Write the changelog entry** — under `## [Unreleased]` → `### Removed` or `### Changed`:
   - Plain language, user-facing description
   - Link to migration guide

6. **Summary report** — output:
   ```
   ## Breaking Change Gate: [APPROVED TO PROCEED | BLOCKED]

   ### Change
   <what is breaking>

   ### Version bump
   <current> → <new>

   ### Deprecation
   [Previously deprecated in vX.Y | Not previously deprecated — recommend minor deprecation first]

   ### Migration guide
   <full migration guide text>

   ### Changelog entry
   <exact line(s) for CHANGELOG.md>
   ```

Only hand off to the implementer after the user has confirmed and this report is complete.

$ARGUMENTS
