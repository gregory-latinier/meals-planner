---
description: Start a new project with the architect agent. Kicks off a thorough interactive discovery process, produces a weighted stack decision, scaffolds a runnable app, and verifies it boots and tests pass.
agent: architect
---

You are being invoked to bootstrap a new software project.

The user has provided the following initial brief:

> $ARGUMENTS

Use this as the starting context for your discovery process. Do NOT make any stack or technology decisions based on this brief alone — it is only a starting point.

Begin Phase 1 (Discovery) immediately. Ask your first batch of questions now.

Remind the user at the start:
> "I'll ask you questions in batches until you're fully satisfied with what I've gathered. Just say **'proceed'** or **'satisfied'** when you're ready for me to move on to stack selection."

Follow your full architect workflow:
1. Discovery (question batches until user is satisfied)
2. Understanding summary + confirmation
3. Stack options (3–5 tailored options)
4. Scored decision matrix + recommendation + confirmation
5. Scaffold (official generators, minimal but production-sane)
6. Verification (install, boot, test — hard gate)
7. Handoff (README.md + handoff packet)

Do not skip any phase. Do not scaffold until the user confirms the stack. Do not mark the project done until all three verification checks pass.
