---
description: Prepare a release — determine SemVer bump, update CHANGELOG, write release notes, and provide the exact commands to tag and publish.
---

You are preparing a new release for this open-source project. Follow the `github-maintainer` skill release tagging flow and `repo-conventions` changelog policy.

1. Run `git log $(git describe --tags --abbrev=0)..HEAD --oneline` to list commits since the last tag (or all commits if no tag exists yet).
2. Analyze the commits to determine the correct SemVer bump:
   - Any `BREAKING CHANGE` or breaking behavior → `major`
   - Any `feat:` commit → `minor`
   - Only `fix:`, `chore:`, `docs:`, `perf:`, `style:` → `patch`
3. Read the current `CHANGELOG.md` `## [Unreleased]` section.
4. Consolidate commits + unreleased entries into clean, user-facing changelog entries grouped by: Added, Changed, Deprecated, Removed, Fixed, Security.
5. Propose the new version number (`vX.Y.Z`).
6. Show the exact CHANGELOG diff to apply (rename `[Unreleased]` → `[X.Y.Z] - YYYY-MM-DD`, add new empty `[Unreleased]`).
7. Provide the exact commands to run in order:
   ```
   # 1. Apply CHANGELOG update
   # 2. git add CHANGELOG.md
   # 3. git commit -m "chore(release): bump version to X.Y.Z"
   # 4. git tag -a vX.Y.Z -m "Release X.Y.Z"
   # 5. git push origin main --tags
   # 6. gh release create vX.Y.Z --title "vX.Y.Z" --notes "<release notes>"
   ```
8. Ask for confirmation before any write operations.

$ARGUMENTS
