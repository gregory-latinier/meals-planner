# Contributing to meals-planner

Thank you for your interest in contributing! This document covers how to set up
the project locally, the conventions we follow, and the PR process.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/).
By participating, you agree to uphold it.

## Getting Started

1. Fork the repository and clone your fork:
   ```sh
   git clone https://github.com/YOUR_USERNAME/meals-planner.git
   cd meals-planner
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Configure environment and start local infrastructure:
   ```sh
   cp .env.example .env
   docker compose up -d
   ```

   Note: PostgreSQL is exposed on host port `5434` to avoid collisions with other local projects.

4. Prepare the database/client:
   ```sh
   npx prisma db push
   npx prisma generate
   # or: npm run test:setup
   ```

5. Verify the setup works:
   ```sh
   npm run lint
   npm test
   ```

6. Start the app:
   ```sh
   npm run dev
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

Open a [Discussion](https://github.com/gregory-latinier/meals-planner/discussions) for
questions rather than issues.
