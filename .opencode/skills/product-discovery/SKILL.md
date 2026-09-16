---
name: product-discovery
description: Use when discussing a new idea, feature, or problem to scope before implementation. Guides structured discovery conversations and produces durable product docs. Trigger keywords: idea, feature, discuss, scope, MVP, what should we build, problem, user need, product, roadmap, vision, backlog refinement, discovery.
---

# Product Discovery

This skill guides structured product discovery conversations across the full product lifecycle — from initial idea to post-release iteration.

## Discovery Conversation Structure

A good discovery session covers these areas in order:

### 1. Problem framing
- What is the problem?
- Who experiences it and in what context?
- How do they solve it today (workaround)?
- What is the cost of not solving it?

### 2. Success definition
- What does the user achieve when this is done?
- What is the measurable outcome?
- What would make this a failure?

### 3. Scope boundaries
- What is explicitly in scope?
- What is explicitly out of scope?
- What are the constraints (platform, performance, time, budget)?

### 4. Approach options
- What is the simplest version that delivers value?
- What are 2–3 alternative approaches and their tradeoffs?
- Are there known risks or unknowns that need a spike?

### 5. Prioritization
- Must-have vs. nice-to-have
- Now vs. Next vs. Later
- Dependencies on other features

## Product Artifacts

Every confirmed discovery session must produce at least one written artifact persisted to `docs/product/`:

| Artifact | Location | Content |
|---|---|---|
| Feature brief | `docs/product/features/<slug>.md` | Problem, goal, scope, acceptance criteria, risks |
| ADR | `docs/product/decisions/ADR-<N>-<title>.md` | Decision context, options, outcome, consequences |
| Research note | `docs/product/research/<topic>-<YYYY-MM-DD>.md` | Findings, evidence, recommendations |
| Vision | `docs/product/vision.md` | Product purpose, target users, long-term goals |
| Roadmap | `docs/product/roadmap.md` | Now / Next / Later feature map |

## Feature Brief Template

```markdown
# Feature: <title>

**Status**: Draft | Under Review | Approved | Implemented | Deprecated  
**Created**: YYYY-MM-DD  
**Last updated**: YYYY-MM-DD  
**Target release**: vX.Y.Z | backlog  

## Problem
[What problem does this solve, and for whom?]

## Goal
[One sentence: what should be true when this is done?]

## Success criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

## Scope

### In scope
- [What this covers]

### Out of scope
- [What this explicitly does NOT cover]

## Approach
[Chosen implementation direction and rationale. If multiple options were considered, link to ADR.]

## Acceptance criteria
- [ ] [Specific, testable condition 1]
- [ ] [Specific, testable condition 2]
- [ ] [Specific, testable condition 3]

## Risks / open questions
- [Known unknowns, assumptions, dependencies]

## Related
- Issues: #N, #N
- ADRs: ADR-NNNN
- Research: research/<topic>-<date>.md
```

## ADR Template

```markdown
# ADR-<NNNN>: <Title>

**Date**: YYYY-MM-DD  
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-NNNN  

## Context
[What situation led to this decision? What problem are we solving?]

## Options considered

### Option 1: <name>
- Pros: ...
- Cons: ...

### Option 2: <name>
- Pros: ...
- Cons: ...

## Decision
[What was decided, and why?]

## Consequences
[What are the implications — positive and negative — of this decision?]
```

## Readiness Gate

A feature is **ready for ticketing** when:
- [ ] Problem is clearly stated
- [ ] Success criteria are defined and measurable
- [ ] Scope boundaries (in/out) are explicit
- [ ] Approach is chosen (or a spike is scoped)
- [ ] Feature brief is written and confirmed by user
- [ ] Roadmap updated if applicable

Only after all items are checked: output "Ready for ticketing: yes" and offer handoff to `orchestrator`.
