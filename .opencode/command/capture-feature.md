---
description: Persist the current discovery discussion as a feature brief to docs/product/features/. Creates or updates the markdown file with full problem, goal, scope, acceptance criteria, and risks.
---

You are capturing the output of a product discovery session as a durable feature brief.

Follow these steps:

1. Review the current conversation to extract:
   - Feature title (short, imperative, kebab-case for filename)
   - Problem statement
   - Goal (one sentence)
   - Success criteria (measurable)
   - In scope / out of scope
   - Chosen approach and rationale
   - Acceptance criteria (specific and testable)
   - Risks and open questions
   - Target release
   - Related issues, ADRs, or research notes

2. If any section is missing or unclear, ask one targeted question to fill the gap before writing.

3. Write the feature brief to:
   `docs/product/features/<feature-slug>.md`

   Use the feature brief template from the `product-discovery` skill exactly.

4. If a significant architectural or product decision was made during this session, also write:
   `docs/product/decisions/ADR-<next-number>-<title>.md`

   Determine the next ADR number by checking existing files in `docs/product/decisions/`.

5. Update `docs/product/roadmap.md`:
   - Add the feature to the appropriate section (Now / Next / Later) based on target release.

6. Report what was written:

```
## Feature Brief Captured

File: docs/product/features/<slug>.md
ADR: docs/product/decisions/ADR-<N>-<title>.md (if applicable)
Roadmap: updated (section: Now | Next | Later)

Ready for ticketing: yes
Hand off to orchestrator? (yes/no)
```

$ARGUMENTS
