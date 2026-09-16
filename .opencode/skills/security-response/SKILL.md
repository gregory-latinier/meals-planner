---
name: security-response
description: Use when handling a security vulnerability report, CVE, coordinated disclosure, security patch, or security advisory. Trigger keywords: security, vulnerability, CVE, exploit, disclosure, security patch, security advisory, responsible disclosure, embargo.
---

# Security Response

This skill defines the security response process for this OSS project. Follow it whenever a potential vulnerability is reported or discovered.

## Severity Classification

| Severity | Description | Response SLA |
|---|---|---|
| Critical | Remote code execution, auth bypass, data exfiltration | 24 hours |
| High | Privilege escalation, significant data exposure | 72 hours |
| Medium | Limited impact, requires user interaction or unusual config | 7 days |
| Low | Minor information disclosure, theoretical risk | 30 days |

## Intake Process

When a vulnerability is reported (via `SECURITY.md`, email, or private GitHub advisory):

1. **Acknowledge** within 24 hours — confirm receipt, do not confirm or deny the vulnerability yet
2. **Triage** privately — reproduce and assess severity
3. **Assign severity** using the classification above
4. **Open a private GitHub Security Advisory** if not already created by the reporter
5. **Do not discuss publicly** until a fix is released (embargo)

## Patch Flow

1. Develop fix in a **private fork or security advisory branch** — never in a public branch
2. Write a regression test that proves the vulnerability is fixed
3. Verify the fix does not introduce new issues
4. Prepare the release:
   - Bump version (patch for fixes that don't break API, otherwise follow SemVer)
   - Add entry to `CHANGELOG.md` under `Security`
   - Draft the GitHub Security Advisory text
5. Coordinate release date with reporter if they requested coordinated disclosure
6. Release fix and publish advisory simultaneously

## Security Advisory Content

Every published advisory must include:

```
## Summary
[One paragraph: what the vulnerability is, what an attacker could do]

## Affected Versions
[e.g., >= 1.0.0, < 1.4.2]

## Patched Version
[e.g., 1.4.2]

## Workaround
[Steps users can take before upgrading, or "None"]

## Credit
[Reporter name/handle if they want credit]
```

## Post-Release Checklist

- [ ] Fix released and tagged
- [ ] GitHub Security Advisory published
- [ ] CVE requested if severity is High or Critical
- [ ] `CHANGELOG.md` updated under `Security`
- [ ] Users notified (release notes, README notice if critical)
- [ ] Retrospective: how was this introduced? Can we prevent the class of issue?

## What NOT to do

- Do not commit a security fix to a public branch before the release is ready
- Do not disclose details publicly before the fix is available
- Do not assign a severity lower than it deserves to avoid urgency
- Do not skip the regression test
