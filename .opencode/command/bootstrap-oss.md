---
description: Scaffold all OSS repo essentials — README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, GitHub templates, and CI workflow.
---

You are setting up a clean open-source project on GitHub. Use the `oss-bootstrap` skill as your primary guide.

Follow these steps in order:

1. Audit existing files against the required OSS file matrix (README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG, .github/ templates, CI workflow, .gitignore).
2. For each missing file, generate it using the project name, description, and author from context. Ask the user only if you cannot infer these.
3. Scaffold `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`, `.github/PULL_REQUEST_TEMPLATE.md`.
4. Scaffold `.github/workflows/ci.yml` appropriate to the detected stack (or a stack-agnostic placeholder if the stack is not yet defined).
5. Verify README has: name, badges, what it does, install, quickstart, usage, contributing link, license.
6. Verify CHANGELOG has the correct Keep a Changelog structure with an empty `## [Unreleased]` section.
7. Run the first release readiness checklist from the `oss-bootstrap` skill.
8. Report: files created, files already present, any gaps remaining, and suggested next steps.

$ARGUMENTS
