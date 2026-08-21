# Current Coverage Closure Plan

**Status:** Active companion to
[`repowise-perfect-metrics-plan.md`](repowise-perfect-metrics-plan.md).

**Checkpoint:** `4841d2563582eb0c297e6170579e8f6de4585073`

**Measured:** 2026-08-21 by the immutable architecture-metrics collector on a
clean code checkpoint. This document replaces earlier inventories whenever
their paths or percentages no longer describe the current architecture.

## 1. Current baseline

```text
Jest suites: 228 passed / 228 total
Tests: 1477 passed, 1 skipped
Lines: 91.56% (6144/6710)
Branches: 84.46% (2479/2935)
Functions: 88.53% (980/1107)
```

The immutable collector persists LCOV line, branch and function aggregates. It
does not persist Jest's separate statement aggregate, so this checkpoint does
not reconstruct or substitute a statement percentage.

RepoWise ingests the same LCOV through a different mapper:

```text
Mapped files: 330
Lines: 91.56%
Branches: 82.31%
```

The two summaries are related evidence, not interchangeable percentages.

## 2. Coverage principles

1. Tests prove behavior, contracts, interactions, state transitions, error
   mapping, pagination, nullability, bounds, and cleanup.
2. Never add import-only tests for declarations or constants merely to increase
   a percentage.
3. Characterize behavior before refactoring production.
4. Cover specialized adapters with provider doubles and use cases with semantic
   port doubles.
5. Use fake timers or injected delay for polling; never wait in real time.
6. Do not use real credentials, mutate a real repository, or call production
   providers.
7. Raise global thresholds only after the current suite passes them.
8. Do not lower a threshold after it has been enforced.
9. Generated release bundles are not source-coverage targets.
10. A composition root needs wiring/identity tests, not arbitrary extraction.

## 3. Current zero-line-coverage inventory

The current LCOV inventory contains 14 zero-line paths: 13 productive files and
one misplaced test file. Jest discovers tests only under `__tests__`, while
`collectCoverageFrom` includes root-level `*.test.ts` files; therefore the
misplaced release test is visible as uncovered source until it is classified
and migrated.

| Capability   | File                                                                       | Initial action                                |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------------- |
| Branch       | `src/data/repository/branch_name_repository.ts`                            | Pure branch-name behavior contract            |
| Issue        | `src/data/repository/issue/bugbot_issue_repository.ts`                     | Composition/delegation contract               |
| Issue        | `src/data/repository/issue/execution_issue_setup_repository.ts`            | Execution-setup delegation contract           |
| Pull request | `src/data/repository/pull_request/bugbot_pull_request_repository.ts`       | Composition/delegation contract               |
| Pull request | `src/data/repository/pull_request/pull_request_review_repository.ts`       | Phase 4 review capability contract            |
| Test layout  | `src/data/repository/release/repository_release_repository.test.ts`        | Migrate useful scenarios under `__tests__`    |
| Composition  | `src/infrastructure/composition/agent_capability_composition_root.ts`      | Capability and identity wiring test           |
| Composition  | `src/infrastructure/composition/bugbot_composition_root.ts`                | Route/capability wiring test                  |
| Composition  | `src/infrastructure/composition/execution_issue_setup_composition_root.ts` | Exact adapter binding test                    |
| Composition  | `src/infrastructure/composition/issue_use_case_composition.ts`             | Constructor contract or coverage through root |
| Composition  | `src/infrastructure/composition/organization_members_composition_root.ts`  | Exact adapter binding test                    |
| Composition  | `src/infrastructure/composition/pull_request_use_case_composition.ts`      | Constructor contract or coverage through root |
| Composition  | `src/infrastructure/composition/pull_request_use_case_composition_root.ts` | Exact use-case graph and sharing test         |
| Composition  | `src/infrastructure/composition/release_composition_root.ts`               | Release capability binding test               |

Some adapters above are exercised indirectly by higher-level tests but are not
recognized as covered in the current Jest execution graph. Add direct behavior
contracts rather than assuming indirect coverage.

## 4. Lowest-covered non-zero production files

| Priority | File                                                                       |  Lines | Branches | Functions | Required track                                       |
| -------- | -------------------------------------------------------------------------- | -----: | -------: | --------: | ---------------------------------------------------- |
| P0       | `src/data/repository/issue/issue_type_repository.ts`                       | 18.92% |       0% |    16.67% | Issue type provider contract                         |
| P0       | `src/data/repository/release/repository_tag_repository.ts`                 | 19.51% |       0% |       20% | Release/tag correctness track                        |
| P0       | `src/data/repository/branch_lifecycle_repository.ts`                       | 20.83% |       0% |       25% | Branch lifecycle contract                            |
| P0       | `src/data/repository/release/repository_release_publication_repository.ts` | 27.59% |       0% |       25% | Release publication contract                         |
| P0       | `src/data/repository/pull_request/pull_request_lifecycle_repository.ts`    | 28.30% |   11.11% |    37.50% | PR lifecycle contract                                |
| P0       | `src/data/repository/issue/issue_title_repository.ts`                      | 28.95% |       0% |       20% | Issue title provider/error contract                  |
| P1       | `src/infrastructure/setup_workspace_adapter.ts`                            | 33.33% |     100% |        0% | Filesystem adapter contract                          |
| P1       | `src/data/repository/release/repository_default_branch_repository.ts`      | 36.36% |     100% |       50% | Default branch contract                              |
| P1       | `src/data/repository/pull_request/pull_request_changes_repository.ts`      | 59.46% |      50% |    72.73% | Complete existing pagination/error matrix            |
| P1       | `src/data/repository/agent_configuration_policy.ts`                        |    75% |   83.33% |      100% | Complete configuration edge cases                    |
| P1       | `src/data/repository/ai/fixer_agent_adapter.ts`                            |    75% |      50% |       75% | Fixer response/failure contract                      |
| P1       | `src/data/repository/issue_emoji_policy.ts`                                | 76.47% |   54.63% |      100% | Complete label/emoji decision branches               |
| P1       | `src/prompts/index.ts`                                                     | 77.27% |     100% |    57.69% | Cover behavior-bearing prompt exports                |
| P1       | `src/data/repository/organization/organization_members_repository.ts`      | 78.95% |      50% |      100% | Complete pagination/error branches                   |
| P1       | `src/cli.ts`                                                               |    80% |      50% |      100% | Entrypoint lifecycle edge path                       |
| P1       | `src/data/repository/issue/issue_type_assignment_repository.ts`            | 82.86% |   65.38% |      100% | Complete edge branches                               |
| P1       | `src/data/repository/github/github_pagination_adapter.ts`                  | 83.33% |     100% |      100% | Complete pagination terminal branch                  |
| P1       | `src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts`  | 83.82% |      75% |      100% | Complete workflow transitions before complexity work |
| P1       | `src/cli/commands/think.ts`                                                | 84.85% |   66.67% |      100% | Complete CLI failure/input branch                    |
| P1       | `src/application/usecases/single_action_use_case.ts`                       | 85.71% |      65% |      100% | Complete action dispatch/failure transitions         |

Exact percentages must be regenerated before each block; this table is a
checkpoint, not a permanent queue.

Recently closed with behavior-bearing contracts:

- Phase 1 Project Board command/query: 100% lines, branches and functions;
- Phase 2 Branch Preparation replacements and Linked Branch: focused 100%;
- Phase 3 Issue Label Provisioning policy/adapter/use case/root: focused 100%.

## 5. Known test-layout defect to classify

The former misplaced Project Board test was migrated/replaced in Phase 1 and no
longer appears in the production coverage inventory. The current defect is
`src/data/repository/release/repository_release_repository.test.ts`: it is not
under `__tests__`, is not discovered by the configured `testMatch`, and appears
as a 0%-covered production path. Before moving or deleting it:

1. inspect its imports and assertions;
2. confirm whether Jest discovers it;
3. compare it with current release-repository tests;
4. migrate useful scenarios into the focused release capability suites;
5. prove zero remaining references;
6. remove the misplaced file only after the new suites pass.

Do not count a misplaced test file as productive implementation coverage.

## 6. Ordered closure phases

### Phase C0 — Documentation and reproducibility

- publish the authoritative perfect-metrics plan;
- record SHA, commands, tool versions and coverage aggregation caveat;
- keep generated coverage local;
- verify the tracked tree is clean after cleanup.

### Phase C1 — Project board contracts (completed)

Create focused suites for:

- `ProjectBoardCommandRepository`;
- `ProjectBoardQueryRepository`;
- project content lookup and pagination;
- the project-board composition root.

Required scenarios are specified in Sections 5 Tasks 3–4 of the authoritative
plan.

### Phase C2 — Branch contracts (completed)

Cover:

- branch preparation;
- branch naming;
- linked-branch GraphQL behavior;
- branch lifecycle delegation and errors.

### Phase C3 — Issue contracts (in progress)

Label provisioning is complete with focused 100% behavior coverage. Continue
with title, type, Bugbot issue access, execution issue setup, and remaining
branch/error paths in existing issue adapters.

### Phase C4 — Pull-request contracts

Cover review, lifecycle, Bugbot PR delegation, review-thread edges, and the
remaining pull-request changes matrix.

### Phase C5 — Release/tag contracts

Cover default branch, tags, release publication, nullable/incomplete provider
responses, idempotency, and provider errors. Preserve separate capabilities and
permissions.

### Phase C6 — Composition roots

Prove exact classes, intended shared identity, intended independent identity,
and client-factory call counts for every zero-covered root. Do not split roots
for line-count or score cosmetics.

### Phase C7 — Application and entrypoints

Complete state-transition, no-op, failure, parsing, cleanup and unhandled-route
coverage. Preserve separate GitHub Action, local action, and CLI lifecycles.

### Phase C8 — Remaining leaf branches

Generate a fresh LCOV inventory and close every behavior-bearing branch below
100%. Classify declaration-only or exhaustive constant files explicitly rather
than creating meaningless execution.

## 7. Threshold ratchet

After each full closure wave:

```text
Current -> 90 -> 95 -> 98 -> 100
```

For each increase:

1. generate LCOV;
2. verify every newly required test is behavior-bearing;
3. raise statements, branches, functions and lines together where possible;
4. run all global gates;
5. never reduce the enforced threshold.

## 8. Per-file decision record

Before changing a file below 100%, record:

| Field                  | Required evidence                                                         |
| ---------------------- | ------------------------------------------------------------------------- |
| Current SHA            | `git rev-parse HEAD`                                                      |
| Current percentages    | LCOV and RepoWise-mapped values                                           |
| Productive callers     | current source search                                                     |
| Focused tests          | exact paths and discovered test names                                     |
| Missing behavior       | success/no-op/error/pagination/null/boundary                              |
| Decision               | test, semantic refactor after RED, classify, or remove after caller proof |
| Expected metric effect | directional only; never guaranteed                                        |
| Architecture effect    | dependency/ownership/testability statement                                |

## 9. Verification commands

```bash
pnpm exec jest <focused-suite> --runInBand
pnpm exec tsc --noEmit
pnpm run lint
pnpm exec jest --runInBand
METRICS_OUTPUT_DIR="$(mktemp -d "/tmp/copilot-architecture-metrics-$(git rev-parse HEAD)-XXXXXX")" \
  pnpm run metrics:architecture
git diff --check
```

The full publication and RepoWise/Graphify protocols live in
[`repowise-perfect-metrics-plan.md`](repowise-perfect-metrics-plan.md).

## 10. Completion criteria

Coverage closure is complete only when:

- every behavior-bearing production line/branch/function/statement is covered;
- every exclusion/classification is supported by the actual tool scope;
- no import-only percentage test exists;
- focused contracts remain readable and capability-specific;
- global Jest thresholds enforce the achieved level;
- RepoWise ingests the final LCOV successfully;
- TypeScript, ESLint, build, audit and architecture guards pass;
- the final commit is pushed and local/tracking/remote SHAs match;
- generated coverage, RepoWise, Graphify and editor artifacts are absent.
