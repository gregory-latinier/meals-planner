# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Resolve issue #1 reviewer findings: make week plan lookup atomic with Prisma `upsert`, add reliable test Prisma setup scripts for local/CI runs, ignore generated Prisma client artifacts, and expand meal-service validation/error-path tests.
