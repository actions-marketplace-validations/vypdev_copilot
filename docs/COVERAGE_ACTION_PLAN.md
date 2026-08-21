# Current Coverage Closure Plan

**Status:** Active companion to
[`repowise-perfect-metrics-plan.md`](repowise-perfect-metrics-plan.md).

**Checkpoint:** `af32863317977e42ec59b712fc1f371b5f231cad`

**Measured:** 2026-08-20 with `pnpm run test:coverage` on a clean published
checkout. This document replaces the historical ~46%/88-item backlog, whose
paths and percentages no longer described the current architecture.

## 1. Current baseline

```text
Jest suites: 220 passed / 220 total
Tests: 1373 passed, 1 skipped
Statements: 85.52% (6163/7206)
Branches: 80.20% (2346/2925)
Functions: 84.31% (935/1109)
Lines: 86.64% (5867/6771)
```

RepoWise ingests the same LCOV through a different mapper:

```text
Mapped files: 329
Lines: 86.6%
Branches: 77.1%
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

The LCOV parser excludes files named `*.test.*` and paths under `__tests__/`.
Eighteen productive files currently report 0% line coverage:

| Capability    | File                                                                       | Initial action                                                     |
| ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Branch        | `src/data/repository/branch/branch_preparation_repository.ts`              | Focused provider/policy/delegation contract suite                  |
| Branch        | `src/data/repository/branch/linked_branch_repository.ts`                   | GraphQL query/mutation contract suite                              |
| Branch        | `src/data/repository/branch_name_repository.ts`                            | Pure formatting behavior suite or cover through branch preparation |
| Issue         | `src/data/repository/issue/bugbot_issue_repository.ts`                     | Composition/delegation contract                                    |
| Issue         | `src/data/repository/issue/execution_issue_setup_repository.ts`            | Execution setup delegation contract                                |
| Issue         | `src/data/repository/issue/issue_title_repository.ts`                      | Title provider/error contract suite                                |
| Project board | `src/data/repository/project/project_board_query_repository.ts`            | Identity/query/content/pagination contract suite                   |
| Pull request  | `src/data/repository/pull_request/bugbot_pull_request_repository.ts`       | Composition/delegation contract                                    |
| Pull request  | `src/data/repository/pull_request/pull_request_review_repository.ts`       | Review capability contract suite                                   |
| Composition   | `src/infrastructure/composition/agent_capability_composition_root.ts`      | Capability and instance-sharing wiring test                        |
| Composition   | `src/infrastructure/composition/bugbot_composition_root.ts`                | Route/capability wiring test                                       |
| Composition   | `src/infrastructure/composition/execution_issue_setup_composition_root.ts` | Exact adapter binding test                                         |
| Composition   | `src/infrastructure/composition/issue_use_case_composition.ts`             | Constructor contract test or cover through root                    |
| Composition   | `src/infrastructure/composition/issue_use_case_composition_root.ts`        | Exact use-case graph and sharing test                              |
| Composition   | `src/infrastructure/composition/organization_members_composition_root.ts`  | Exact adapter binding test                                         |
| Composition   | `src/infrastructure/composition/pull_request_use_case_composition.ts`      | Constructor contract test or cover through root                    |
| Composition   | `src/infrastructure/composition/pull_request_use_case_composition_root.ts` | Exact use-case graph and sharing test                              |
| Composition   | `src/infrastructure/composition/release_composition_root.ts`               | Release capability binding test                                    |

Some adapters above are exercised indirectly by higher-level tests but are not
recognized as covered in the current Jest execution graph. Add direct contract
coverage rather than assuming indirect behavior.

## 4. Lowest-covered non-zero production files

| Priority | File                                                                       |  Lines | Branches | Functions | Required track                                       |
| -------- | -------------------------------------------------------------------------- | -----: | -------: | --------: | ---------------------------------------------------- |
| P0       | `src/data/repository/issue/issue_type_repository.ts`                       | 18.92% |       0% |    16.67% | Issue type provider contract                         |
| P0       | `src/data/repository/issue/issue_label_provisioning_repository.ts`         | 19.05% |       0% |    14.29% | Label provisioning contract                          |
| P0       | `src/data/repository/release/repository_tag_repository.ts`                 | 19.51% |       0% |       20% | Release/tag correctness track                        |
| P0       | `src/data/repository/project/project_board_command_repository.ts`          | 20.75% |       0% |    11.11% | Project board command contract                       |
| P0       | `src/data/repository/branch_lifecycle_repository.ts`                       | 20.83% |       0% |       25% | Branch lifecycle contract                            |
| P0       | `src/data/repository/release/repository_release_publication_repository.ts` | 27.59% |       0% |       25% | Release publication contract                         |
| P0       | `src/data/repository/pull_request/pull_request_lifecycle_repository.ts`    | 28.30% |   11.11% |    37.50% | PR lifecycle contract                                |
| P1       | `src/infrastructure/setup_workspace_adapter.ts`                            | 33.33% |     100% |        0% | Filesystem adapter contract                          |
| P1       | `src/data/repository/release/repository_default_branch_repository.ts`      | 36.36% |     100% |       50% | Default branch contract                              |
| P1       | `src/data/repository/pull_request/pull_request_changes_repository.ts`      | 59.46% |      50% |    72.73% | Complete existing pagination/error matrix            |
| P1       | `src/data/repository/ai/fixer_agent_adapter.ts`                            |    75% |      50% |       75% | Fixer response/failure contract                      |
| P1       | `src/data/repository/agent_configuration_policy.ts`                        |    75% |   83.33% |      100% | Complete configuration edge cases                    |
| P1       | `src/data/repository/issue_emoji_policy.ts`                                | 76.47% |   54.63% |      100% | Complete label/emoji decision branches               |
| P1       | `src/prompts/index.ts`                                                     | 77.27% |     100% |    57.69% | Cover behavior-bearing prompt exports                |
| P1       | `src/data/repository/organization/organization_members_repository.ts`      | 78.95% |      50% |      100% | Complete pagination/error branches                   |
| P1       | `src/cli.ts`                                                               |    80% |      50% |      100% | Entrypoint lifecycle edge path                       |
| P1       | `src/data/repository/issue/issue_type_assignment_repository.ts`            | 82.86% |   65.38% |      100% | Complete edge branches                               |
| P1       | `src/data/repository/github/github_pagination_adapter.ts`                  | 83.33% |     100% |      100% | Complete pagination terminal branch                  |
| P1       | `src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts`  | 83.82% |      75% |      100% | Complete workflow transitions before complexity work |
| P1       | `src/cli/commands/think.ts`                                                | 84.85% |   66.67% |      100% | Complete CLI failure/input branch                    |

Exact percentages must be regenerated before each block; this table is a
checkpoint, not a permanent queue.

## 5. Known test-layout defect to classify

`src/data/repository/project/project_board_repository.test.ts` appears in the
production coverage tree at 0%. It is not under `__tests__/` and did not run as a
focused suite in the measured test inventory. Before moving or deleting it:

1. inspect its imports and assertions;
2. confirm whether Jest discovers it;
3. compare it with current project-board tests;
4. migrate useful scenarios into the focused query/command suites;
5. prove zero remaining references;
6. remove the misplaced file only after the new suites pass.

Do not count a misplaced test file as productive implementation coverage.

## 6. Ordered closure phases

### Phase C0 — Documentation and reproducibility

- publish the authoritative perfect-metrics plan;
- record SHA, commands, tool versions and coverage aggregation caveat;
- keep generated coverage local;
- verify the tracked tree is clean after cleanup.

### Phase C1 — Project board contracts

Create focused suites for:

- `ProjectBoardCommandRepository`;
- `ProjectBoardQueryRepository`;
- project content lookup and pagination;
- the project-board composition root.

Required scenarios are specified in Sections 5 Tasks 3–4 of the authoritative
plan.

### Phase C2 — Branch contracts

Cover:

- branch preparation;
- branch naming;
- linked-branch GraphQL behavior;
- branch lifecycle delegation and errors.

### Phase C3 — Issue contracts

Cover label provisioning, title, type, Bugbot issue access, execution issue
setup, and remaining branch/error paths in existing issue adapters.

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
