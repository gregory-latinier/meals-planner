# Contributing to meals-planner

Thank you for your interest in contributing! This document covers how to set up
the project locally, the conventions we follow, and the PR process.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).
By participating, you agree to uphold it.

## Getting Started

1. Fork the repository and clone your fork:
   ```sh
   git clone https://github.com/YOUR_USERNAME/meals-planner.git
   cd meals-planner
   ```

2. Install dependencies:
   ```sh
   # add your install command here
   ```

3. Verify the setup works:
   ```sh
   # add your test/lint/build command here
   ```

## Development Workflow

- Create a branch from `main`: `git checkout -b feat/your-feature`
- Make your changes following the conventions below
- Add or update tests for any behavior change
- Update `CHANGELOG.md` under `## [Unreleased]` with a user-facing description
- Update docs if public behavior changed
- Push your branch and open a PR

## Conventions

- **Commits**: `<type>(<scope>): <short description>` — see `repo-conventions` for full list of types
- **Branches**: `<type>/<short-description>` (e.g., `feat/weekly-plan`, `fix/filter-bug`)
- **Tests**: test files live next to source files; test observable behavior, not internals
- **Breaking changes**: discuss in an issue before implementing; see deprecation policy in `repo-conventions`

## Pull Request Checklist

Before opening a PR, verify:

- [ ] CI is green (lint, typecheck, tests)
- [ ] Tests added or updated for any behavior change
- [ ] Docs updated for any user-facing change
- [ ] `CHANGELOG.md` has an entry under `## [Unreleased]`
- [ ] No secrets, debug artifacts, or commented-out code

## Reporting Issues

Use the GitHub issue templates:
- **Bug**: provide steps to reproduce, expected vs actual behavior, environment
- **Feature**: describe the problem you are solving, not just the solution

## Questions

Open a [Discussion](https://github.com/YOUR_USERNAME/meals-planner/discussions) for
questions rather than issues.
