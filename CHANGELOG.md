# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Add calendar-style meal history pages (`/history/YYYY-MM`) with month/week navigation, day-grouped historical meals, week selection from calendar cells, and empty states when no prior plans exist.

### Changed

- Switch project package management from npm to pnpm (pnpm lockfile, scripts, docs, and automation permissions updated).

### Fixed

- Resolve issue #1 reviewer findings: make week plan lookup atomic with Prisma `upsert`, add reliable test Prisma setup scripts for local/CI runs, ignore generated Prisma client artifacts, and expand meal-service validation/error-path tests.
- Change local PostgreSQL host port mapping to `5434` to avoid conflicts with other running local projects.
