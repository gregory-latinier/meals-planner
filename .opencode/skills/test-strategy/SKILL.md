---
name: test-strategy
description: Use when deciding what tests to write, how to structure tests for a new feature or bug fix, or when the user asks about testing approach, test coverage, what to test, or how to test a specific piece of code. Trigger keywords: test, tests, testing, unit test, integration test, what to test, test coverage, write tests, test this.
---

# Test Strategy

Use this skill to determine what tests to write and how to structure them for any given change.

## Test Selection Framework

For every change, ask:

1. **What is the observable behavior being added or modified?**
   Write tests that verify that behavior from the outside, not the internal implementation.

2. **What are the failure modes?**
   - Invalid inputs (null, empty, out-of-range)
   - External dependency failures (network error, DB unavailable)
   - Concurrent or race conditions (if applicable)
   - Authorization / permission boundaries

3. **What already exists?**
   Check for existing tests before adding new ones — extend or update rather than duplicate.

## Test Types by Change Type

| Change Type | Minimum Tests Required |
|---|---|
| New pure function | Unit tests for happy path + all edge cases |
| New API endpoint | Integration test: success, auth failure, invalid input |
| Bug fix | Regression test that reproduces the bug, then passes with the fix |
| Refactor (no behavior change) | Ensure existing tests still pass; add none unless coverage gap found |
| UI component | Render test + interaction test for user-facing behavior |
| Data migration | Test against representative sample data; verify rollback safety |

## Test Structure (Arrange-Act-Assert)

```
describe('<unit under test>', () => {
  it('<does something specific under a specific condition>', () => {
    // Arrange: set up inputs and mocks
    // Act: call the thing being tested
    // Assert: verify the expected outcome
  })
})
```

## Mocking Guidelines

- Mock at the boundary: mock external APIs, databases, and file system — not internal modules
- Use real implementations for pure logic; only mock side effects
- Name mocks clearly: `mockFetchMeals`, not `mock1`
- Reset mocks between tests to prevent state leakage

## Coverage Goals

- Aim for behavior coverage, not line coverage
- 100% line coverage with bad tests is worse than 80% with meaningful ones
- Prioritize: business-critical paths > error handling > happy path > edge cases
