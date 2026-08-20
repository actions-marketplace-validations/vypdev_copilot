# RepoWise Perfect Metrics and Architecture Closure Implementation Plan

> **For Hermes:** Efra approved execution on 2026-08-20. Use quality-first-repository-development, test-driven-development, iterative-hotspot-refactoring, and requesting-code-review. Execute one evidence-backed block at a time; never optimize a RepoWise number without a current defect, missing contract, or justified semantic boundary.

**Status:** Documentation baseline stabilized. The commit containing this document
publishes the baseline; implementation proceeds only in the phase order and
with the gates below.

**Goal:** Make `vypdev/copilot` an evidence-backed Clean Architecture reference implementation, drive every controllable RepoWise and coverage metric to its defensible maximum, and explicitly classify the historical/tool-derived signals that cannot be changed honestly or immediately.

**Architecture:** Preserve the dependency direction `entrypoint -> lifecycle composition root -> application workflow/use case -> semantic application port -> specialized adapter -> provider protocol/client`. Improve health first through contract coverage and verified behavior, then reduce complexity only where current callers and tests prove a real responsibility split. Treat RepoWise, Graphify, coverage, source inspection, architecture guards, Git history, and independent review as complementary evidence; none is independently authoritative.

**Tech Stack:** TypeScript 5.9, Jest, ESLint, pnpm, NCC, RepoWise, Graphify, GitHub REST/GraphQL capability adapters.

---

## 0. Freeze and execution rule

This document is a **plan only**. At the time it was written:

- no production source was modified;
- no test was modified;
- no existing tracked documentation was modified;
- no commit or push was performed;
- published `HEAD` was `af32863317977e42ec59b712fc1f371b5f231cad`;
- the working tree was clean.

Efra approved execution on 2026-08-20. The documentation stabilization block
must be published before production or test implementation begins. After that
checkpoint, each implementation task below requires its own caller audit, RED
contract, focused gates, global gates, independent review, atomic commit, normal
push to `origin/master`, `HEAD == origin/master == remote master`, and a clean
working tree.

## 1. Current verified baseline

### 1.1 Published revision

```text
Repository: vypdev/copilot
Branch: master
Published Phase D implementation SHA: af32863317977e42ec59b712fc1f371b5f231cad
Phase D: queue/dispatcher increment published; strict local-lifecycle named-root
exit criterion reopened and tracked after the P0 behavior-contract blocks
```

### 1.2 Quality gates

```text
Jest suites: 220 passed / 220 total
Tests: 1373 passed, 1 skipped
TypeScript: PASS
ESLint: PASS
NCC build: PASS
Production audit: PASS — no known vulnerabilities
Git diff check: PASS
```

Jest summary:

```text
Statements: 85.52%
Branches:   80.20%
Functions:  84.31%
Lines:      86.64%
```

RepoWise-ingested LCOV summary:

```text
Mapped files: 329
Lines: 86.6%
Branches: 77.1%
Unmapped reports: 1 historical/nonexistent path
Test-to-code map: unavailable for Jest LCOV
```

The Jest and RepoWise percentages use different aggregation/mapping rules and must never be presented as if they were the same metric.

### 1.3 RepoWise checkpoint

Index synchronized to `af32863317977e42ec59b712fc1f371b5f231cad`:

```text
Graph: 3,175 nodes / 6,885 edges
Indexed pages: 410
Average health: 8.02/10 — Healthy
Hotspot health: 5.52/10
Maintainability average: 9.23/10
Performance average: 9.99/10
Performance analysis coverage: 100% (613/613 files)
Performance findings: 17 (4.58/10K covered LOC)
Dead-code safe findings: 0
Unreachable files: 0
Unused exports: 0
```

Health distribution by code volume:

```text
Healthy: 63.2% — 575 files
Warning: 32.3% — 123 files
Alert: 4.5% — 16 files
```

### 1.4 Graphify checkpoint

```text
Nodes: 3,271
Edges: 8,424
Communities: 217
Persistent warning: docs.json produces zero nodes
Graph direction metadata: directed=false
```

Graphify cannot prove dependency direction or cycle absence in this checkpoint. Source imports and executable architecture tests remain authoritative for those properties.

### 1.5 Metric caveats

RepoWise health combines controllable static signals with historical signals:

- complexity, nesting, file size, coverage and some duplication are immediately controllable;
- churn, change entropy, co-change scatter and prior defects are history-derived;
- recent architecture reconstruction temporarily penalizes small, now-correct files;
- tracked release bundles create historical co-change signals even when build outputs are correctly excluded from source commits;
- duplicated test setup and prompt templates can create large marker counts without indicating a production design defect.

The raw `1,417` marker count is **not** a backlog of 1,417 code changes.

The Phase D range risk was `9.5/high` (98.9th percentile), driven mainly by 949 additions, 647 deletions and broad entropy. This is a change-size/review signal, not evidence that the published architecture is defective. Phase D passed independent review and every quality gate.

## 2. Definition of “perfect”

### 2.1 Architectural perfection — mandatory

All of these must hold:

1. No production dependency points from an inner layer to infrastructure, runtime, SDK, filesystem, CLI or provider details.
2. Every runtime and lifecycle owns an explicit composition root.
3. Application ports describe semantic capabilities, not `rest.*`, GraphQL documents, pagination iterators, HTTP verbs or SDK DTOs.
4. Provider protocols live in infrastructure.
5. Query and command capabilities remain split when they have different callers, permissions, behavior or lifecycle.
6. Every adapter has focused contract tests for success, empty, pagination, nullable data, provider failure and malformed-provider edge cases that it can encounter.
7. Every use case has deterministic tests for success, no-op, failure and boundary conditions.
8. No compatibility shim, universal client, god repository, registry facade or metric-only helper is introduced.
9. No production cycle exists.
10. Every remaining RepoWise finding is resolved or classified with current caller/test/source evidence.

### 2.2 Controllable numeric targets — hard gates

A final release candidate must target:

```text
Jest statements: 100%
Jest branches:   100%
Jest functions:  100%
Jest lines:      100%
RepoWise-mapped production lines: 100%
RepoWise-mapped production branches: 100%
Dead-code safe findings: 0
Unreachable production files: 0
Unused production exports: 0
Actionable performance findings: 0
Production dependency cycles: 0
Forbidden application imports: 0
Dispatcher/construction boundary violations: 0
Git diff check failures: 0
Known high production vulnerabilities: 0
```

Declaration-only files, exhaustive constants and generated release bundles may be classified rather than artificially executed, but only if the metric tool supports an honest documented scope. Do not add meaningless import-only tests to inflate coverage.

### 2.3 RepoWise health targets — acceptance ladder

Because history-derived biomarkers cannot be erased honestly on demand, use two gates:

**Immediate controllable target:**

```text
Average health >= 9.0
Hotspot health >= 8.0
Worst production file >= 7.5
Maintainability >= 9.7
Performance = 10.0 or all remaining findings classified as intentional polling/bounded I/O
Production alert volume = 0%
```

**Mature target after the rolling history window stabilizes:**

```text
Average health >= 9.5
Hotspot health >= 9.0
Worst production file >= 8.5
No unclassified critical/high history-derived findings
```

A literal `10.0` across history-derived metrics is aspirational, not a valid reason to rewrite Git history, create no-op commits, merge semantically distinct code, delete legitimate lifecycle roots or suppress findings without justification.

### 2.4 Rejection rules

Reject any proposed change whose only justification is:

- file score;
- file line count;
- duplicated syntax without shared semantics;
- historical churn on a now-small boundary;
- co-change caused by an atomic architectural migration;
- a generated bundle relationship;
- RepoWise’s generic `extract_helper` name;
- a desire to reduce the raw marker count.

Every accepted change must state the behavior defect, contract gap, ownership ambiguity, semantic duplication or verified complexity it resolves.

## 3. Current production hotspot inventory

| Priority | File                                                                         | Current score | Current evidence                                                                | Initial classification                                            |
| -------- | ---------------------------------------------------------------------------- | ------------: | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| P0       | `src/data/repository/project/project_board_command_repository.ts`            |          1.95 | 188 NLOC, no focused recognized test, GraphQL query/mutation/pagination mixed   | Real contract and responsibility audit required                   |
| P0       | `src/data/repository/branch/branch_preparation_repository.ts`                |           2.6 | 160 NLOC, no focused recognized test, Git + provider + branch policy delegation | Real coverage gap; split only after behavior characterization     |
| P0       | `src/data/repository/issue/issue_label_provisioning_repository.ts`           |           2.6 | nesting 4, no focused recognized test                                           | Real contract coverage gap                                        |
| P0       | `src/data/repository/branch/linked_branch_repository.ts`                     |           2.6 | 120 NLOC, no focused recognized test                                            | Real GraphQL contract coverage gap                                |
| P0       | `src/data/repository/pull_request/pull_request_review_repository.ts`         |           2.7 | 197 NLOC, no focused recognized test; thread object built internally            | Real capability/contract audit required                           |
| P0       | `src/data/repository/project/project_board_query_repository.ts`              |           2.8 | CCN 10, no focused recognized test, query + content lookup                      | Real contract coverage gap; possible two-capability adapter split |
| P0       | `src/data/repository/merge_repository.ts`                                    |           2.8 | CCN 16, nesting 6, 206 NLOC, tests exist                                        | Real workflow complexity; semantic extraction candidate           |
| P1       | `src/data/repository/pull_request/pull_request_lifecycle_repository.ts`      |           2.9 | partial focused coverage                                                        | Contract completion first                                         |
| P1       | `src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts`    |           3.1 | CCN 13, 161 NLOC, tests exist                                                   | Real application-workflow complexity audit                        |
| P1       | `src/application/usecases/steps/commit/check_changes_issue_size_use_case.ts` |           3.5 | CCN 9, nesting 4                                                                | Complete branch tests before extracting policy                    |
| P1       | `src/application/usecases/steps/issue/assign_members_to_issue_use_case.ts`   |           3.5 | CCN 17, nesting 4                                                               | Real policy decomposition candidate                               |
| P1       | `src/data/repository/issue/issue_title_repository.ts`                        |           3.5 | no focused recognized test                                                      | Contract coverage first                                           |
| P1       | `src/data/repository/issue/issue_type_repository.ts`                         |           3.5 | no focused recognized test                                                      | Contract coverage first                                           |
| P1       | `src/data/repository/pull_request/pull_request_review_thread_repository.ts`  |           3.6 | CCN 12, nesting 4, focused tests exist                                          | Complete edge cases before refactor                               |
| P1       | `src/infrastructure/composition/issue_use_case_composition_root.ts`          |           3.8 | composition wiring; no direct recognized test                                   | Wiring identity/binding test, not line-count split                |
| P1       | `src/data/repository/issue/issue_type_assignment_repository.ts`              |           3.9 | CCN 13, nesting 4, focused tests exist                                          | Policy extraction only if semantics are separable                 |
| P2       | `src/application/usecases/actions/initial_setup_use_case.ts`                 |           4.0 | 209 NLOC, tests exist                                                           | Transition matrix completion                                      |
| P2       | `src/application/usecases/steps/issue/prepare_branches_use_case.ts`          |           4.1 | CCN 10, nesting 3                                                               | Branch-transition tests first                                     |
| P2       | `src/actions/github_action.ts`                                               |           4.2 | 167 NLOC, lifecycle entrypoint, tests exist                                     | Preserve entrypoint; fill missing boundary tests                  |
| P2       | `src/data/repository/pull_request/pull_request_changes_repository.ts`        |           4.3 | focused pagination tests exist                                                  | Re-measure after coverage completion                              |

Explicit non-targets unless new evidence appears:

- `src/actions/local_action.ts` is **not** a non-target: its inline adapter assembly
  is the reopened Phase D named-root debt, scheduled after the P0 contract blocks;
- `src/actions/main_run_dispatcher.ts`: now a pure 32-line dispatcher; current churn/entropy is historical;
- `src/cli.ts`: a seven-line bootstrap;
- issue-comment and pull-request-review-comment wrappers: separate lifecycle semantics sharing a workflow;
- specialized composition roots: construction is their responsibility;
- build bundles: release artifacts, not source architecture targets.

## 4. Documentation stabilization before implementation

### Task 1: Establish one authoritative current plan

**Objective:** Remove conflicting current/historical instructions before authorizing code changes.

**Files:**

- Modify: `docs/total-architecture-reconstruction-plan.md`
- Modify: `docs/COVERAGE_ACTION_PLAN.md`
- Modify: `docs/graphify-development.md`
- Create: `docs/repowise-perfect-metrics-plan.md`

**Steps:**

1. Mark this plan’s published SHA and measurement timestamp.
2. Replace stale RepoWise evidence based on `f0c16654` with the `af328633` checkpoint.
3. Change Phase D status to completed/published.
4. Preserve release/tag correctness work as a separate correctness priority rather than silently replacing it with metric work.
5. Replace `COVERAGE_ACTION_PLAN.md` with a current generated coverage inventory; move its historical content to an explicitly historical appendix or delete it after verifying no docs link requires it.
6. Link the authoritative plan from `docs/repository-architecture.md` and `docs/capability-map.md` without duplicating volatile metrics in multiple files.
7. Record the Jest/RepoWise aggregation difference.
8. Record that RepoWise-generated `.repowise/`, `.claude/`, `.vscode/`, coverage and Graphify outputs are local and never committed.

**Verification:**

```bash
rg 'f0c16654|working tree: verified Phase D|next production priority' \
  docs/total-architecture-reconstruction-plan.md docs/graphify-development.md
rg 'src/data/repository/(queue_utils|workflow_repository|ai_repository|branch_repository|project_repository)\.ts' \
  docs/COVERAGE_ACTION_PLAN.md
pnpm exec prettier --check docs/COVERAGE_ACTION_PLAN.md docs/repowise-perfect-metrics-plan.md
git diff --check
```

Expected: every historical reference is either removed from current sections or explicitly labelled historical; no old path is presented as current work.

**Current result:** complete in the documentation stabilization block. The
companion plan is included in the tracked documentation set, Phase D and the
`af328633` RepoWise checkpoint are current, the historical coverage backlog was
replaced with a fresh LCOV inventory, architecture/capability guides link to
this plan, the eliminated `Execution` SCC is no longer described as active, and
generated artifacts remain uncommitted.

**Commit after approval:**

```bash
git add docs
git commit -m "docs: stabilize perfect metrics execution plan"
```

### Task 2: Create reproducible metric protocol

**Objective:** Ensure every future comparison measures the same checkout and scope.

**Files:**

- Modify: `docs/repowise-perfect-metrics-plan.md`
- Modify: `docs/graphify-development.md`
- Create: `scripts/collect-architecture-metrics.cjs`
- Create: `src/tooling/__tests__/collect_architecture_metrics.test.ts`
- Modify: `package.json`

**Protocol:**

```bash
test -z "$(git status --porcelain)"
METRICS_OUTPUT_DIR="$(mktemp -d "/tmp/copilot-architecture-metrics-$(git rev-parse HEAD)-XXXXXX")" \
  pnpm run metrics:architecture
test -z "$(git status --porcelain)"
```

Every run receives a new empty directory, so rerunning the same SHA preserves
previous metric records instead of mixing or deleting them. When
`METRICS_OUTPUT_DIR` is omitted, the collector creates an equivalent unique
temporary directory and prints its path in the final JSON result.

The versioned collector:

- derives the complete inventory directly from `coverage/lcov.info`;
- passes `--no-workspace` to RepoWise repository commands and `--path .` to
  coverage commands;
- writes metadata with the canonical output directory, resolved executable paths,
  exact argv, tool versions and validated raw reports outside the repository;
- applies bounded per-command timeouts (10 minutes for coverage and Graphify, 15
  minutes for RepoWise initialization, 5 minutes for RepoWise analyses and 30
  seconds for control commands); each command runs in an isolated process group,
  and timeout, `SIGINT` or `SIGTERM` terminate that group before control returns
  through the restoration path;
- rejects an output path that is inside the repository lexically or through a
  symlink, rejects non-empty destinations, and fails before tool execution when
  any mutable workspace path contains a symlink that could escape restoration;
- snapshots and restores `build/`, `coverage/`, `graphify-out/`, local
  `.repowise/`, editor/agent configuration and setup files byte-for-byte;
- attempts restoration and Git/HEAD verification on success and failure while
  preserving the original collection error;
- publishes `complete.json` only after every report validates, restoration
  succeeds, HEAD is unchanged and the tracked tree is clean.

Before changing this workflow, verify RepoWise’s supported ignore/config
mechanism from its installed version. Do not invent `.repowiseignore` semantics
or silently exclude files.

Acceptance:

- metric record includes SHA, timestamp, commands, tool versions and scopes;
- pre-existing mutable workspace paths are byte-for-byte identical afterward and
  paths created only by the run are absent;
- no credential, auth state, database, report or editor config is committed;
- direct `repowise health` after coverage ingestion is the health authority, not a partial embedded snapshot from incremental status.

## 5. Coverage-first adapter hardening

No production refactor starts in this phase. Characterize current behavior first.

### Task 3: Project board command contract

**Objective:** Give `ProjectBoardCommandRepository` complete deterministic behavior coverage before deciding whether query and mutation responsibilities should move.

**Files:**

- Create: `src/data/repository/project/__tests__/project_board_command_repository.test.ts`
- Exercise: `src/data/repository/project/project_board_command_repository.ts`
- Reference: `src/application/ports/project_board_command_ports.ts`
- Reference: `src/application/ports/project_board_query_ports.ts`

**Required tests:**

1. Missing content ID throws the historical error and performs no GraphQL mutation.
2. Missing field throws.
3. Missing option throws.
4. Current option already matches and returns `false` without mutation.
5. Item is found on a later page.
6. Item is absent after final page and mutation behavior is characterized exactly before correction.
7. Successful mutation returns `true` only when `projectV2Item` exists.
8. Nullable mutation response returns `false`.
9. `setTaskPriority` maps to `Priority`.
10. `setTaskSize` maps to `Size`.
11. `moveIssueToColumn` maps to `Status`.
12. The provider client/token is resolved at the expected lifecycle frequency.

**Focused command:**

```bash
pnpm exec jest src/data/repository/project/__tests__/project_board_command_repository.test.ts --runInBand
```

Do not extract query strings or pagination helpers merely for score improvement. First review whether GraphQL field discovery, item lookup and mutation have independently reusable contracts.

### Task 4: Project board query contracts

**Objective:** Cover project identity resolution, content lookup and pagination completely.

**Files:**

- Replace or relocate after caller audit: `src/data/repository/project/project_board_repository.test.ts`
- Preferred focused tests:
  - `src/data/repository/project/__tests__/project_board_query_repository.test.ts`
  - `src/data/repository/project/__tests__/project_board_content_query_repository.test.ts`
- Exercise: `src/data/repository/project/project_board_query_repository.ts`

**Required matrix:**

- invalid numeric project ID;
- organization owner;
- user owner;
- owner lookup failure;
- GraphQL project lookup failure;
- missing project;
- missing issue/PR content;
- project node null;
- first-page content match;
- later-page content match;
- `hasNextPage=true` with null cursor;
- 100-page safety boundary;
- content absent after all pages;
- `isContentLinked` first/later/not found;
- nullable content nodes.

Only after GREEN characterization may the implementer consider separate adapters implementing `ProjectBoardQueryPort` and `ProjectBoardContentQueryPort`. A split is accepted only if callers, failure semantics and composition ownership remain clearer than the current dual-interface adapter.

### Task 5: Branch preparation contract

**Objective:** Cover provider pagination, transition policy and Git delegation without changing behavior.

**Files:**

- Create: `src/data/repository/branch/__tests__/branch_preparation_repository.test.ts`
- Exercise: `src/data/repository/branch/branch_preparation_repository.ts`
- Reference: `src/application/ports/branch_preparation_ports.ts`

**Required tests:**

- branch pages aggregate until empty page;
- remote fetch and commit-tag delegate exactly once;
- missing hotfix base produces failure result;
- existing target branch is a no-op success;
- previous issue branch becomes rename base;
- hotfix uses hotfix base;
- parent branch preservation during rename;
- linked branch call receives exact base/name/issue/token;
- provider failure maps to historical failure result;
- remove branch success and provider failure;
- wrapper delegations preserve arguments.

Before changing production code, inventory every caller of `BranchPreparationPort`, `BranchNameRepository`, `LinkedBranchRepository` and `GitCliRepository`. Construction types in this adapter are a possible composition concern, but no change is authorized until current composition ownership is proven.

### Task 6: Linked branch GraphQL contract

**Objective:** Fully characterize linked-branch query/mutation behavior.

**Files:**

- Create: `src/data/repository/branch/__tests__/linked_branch_repository.test.ts`
- Exercise: `src/data/repository/branch/linked_branch_repository.ts`

Cover:

- normal head ref;
- tag-qualified ref;
- escaped GraphQL ref content;
- explicit OID overrides queried OID;
- missing repository ID;
- missing issue ID;
- missing branch OID;
- successful mutation payload and URLs;
- nullable linked branch response;
- query failure;
- mutation failure.

Review whether dynamic interpolation of `refForGraphQL` can become a GraphQL variable without changing behavior. Treat this as correctness/security hardening, not a metric extraction.

### Task 7: Issue provisioning/title/type contracts

**Objective:** Eliminate recognized no-test gaps in issue adapters.

**Files:**

- Create: `src/data/repository/issue/__tests__/issue_label_provisioning_repository.test.ts`
- Create: `src/data/repository/issue/__tests__/issue_title_repository.test.ts`
- Create: `src/data/repository/issue/__tests__/issue_type_repository.test.ts`
- Exercise matching production files.

For every provider method cover success, already-exists/no-op, pagination if present, nullable response, not-found, provider error and exact semantic return.

Do not share a test helper across these repositories unless it models the same provider contract and improves assertions rather than hiding them.

### Task 8: Pull-request review contract

**Objective:** Cover every independent capability currently grouped in `PullRequestReviewRepository`.

**Files:**

- Create: `src/data/repository/pull_request/__tests__/pull_request_review_repository.test.ts`
- Exercise: `src/data/repository/pull_request/pull_request_review_repository.ts`
- Existing reference: `src/data/repository/__tests__/pull_request_review_thread_repository.test.ts`

Required tests:

- requested and submitted reviewer deduplication;
- reviewer lookup failure;
- empty reviewer request no-op;
- reviewer request success/failure;
- all review-comment pages;
- nullable body/path/line/node ID;
- single comment body success/not-found/failure;
- review-thread delegation;
- empty review comments no-op;
- partial `Promise.allSettled` success;
- all review-comment creations fail;
- update review comment.

After GREEN, audit callers per method. Split only when independent caller sets and semantic ports already justify specialized adapters; do not replace the class with a cosmetic facade.

## 6. Real complexity reduction

### Task 9: Extract merge polling policy using TDD

**Objective:** Remove timing, check-state policy and provider mutation orchestration from one CCN-16 method without creating a universal workflow service.

**Files likely to change:**

- Modify: `src/data/repository/merge_repository.ts`
- Existing pure policy: `src/data/repository/merge_checks_policy.ts`
- Create if current callers justify:
  - `src/application/ports/merge_wait_ports.ts`
  - `src/application/usecases/merge/wait_for_pull_request_checks_use_case.ts`
  - `src/infrastructure/time/timer_merge_polling_delay_adapter.ts`
  - `src/infrastructure/composition/merge_composition_root.ts`
- Tests:
  - `src/application/usecases/merge/__tests__/wait_for_pull_request_checks_use_case.test.ts`
  - `src/infrastructure/time/__tests__/timer_merge_polling_delay_adapter.test.ts`
  - update `src/data/repository/__tests__/merge_repository.test.ts`

**RED contracts:**

- PR-specific check runs are selected over unrelated runs;
- pending checks delay and retry;
- failed checks fail deterministically;
- no check runs uses bounded registration grace;
- fallback statuses wait while pending;
- no checks/statuses allows merge;
- timeout is exact;
- delay is injectable and does not call real timers in application tests;
- PR creation/update/merge payloads remain unchanged;
- direct merge fallback remains unchanged and separately tested.

**Architecture decision:**

Application may own the semantic wait policy only if its inputs are provider-neutral states. GitHub DTO mapping and REST calls remain in an adapter. If a provider-neutral contract would become wider or less clear than the current specialized adapter, keep the policy in infrastructure and extract pure functions plus an injected delay there.

**Success thresholds:**

```text
merge_repository max CCN <= 8
max nesting <= 3
all historical behaviors covered
no real-time sleeps in unit tests
no new universal merge client/repository
```

### Task 10: Decompose member-assignment policy

**Objective:** Reduce CCN 17 in `assign_members_to_issue_use_case.ts` through pure semantic policy extraction.

**Files likely to change:**

- Modify: `src/application/usecases/steps/issue/assign_members_to_issue_use_case.ts`
- Create: `src/application/policies/issue_member_selection_policy.ts`
- Create: `src/application/policies/__tests__/issue_member_selection_policy.test.ts`
- Update: existing assign-members tests.

Characterize and extract only selection decisions: creator eligibility, exclusions, desired count, current members, organization candidates and deterministic result. Provider calls and result messages remain in the use case.

Target: use-case CCN <= 8; policy is pure and table-tested.

### Task 11: Review bugbot autofix orchestration

**Objective:** Separate preparation, provider invocation, safe workspace validation and result mapping only where already represented by semantic collaborators.

**Files:**

- Audit: `src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts`
- Audit existing policies/workflows in the same directory before creating anything.
- Update its existing focused test suite first.

Reject RepoWise suggestions that merge autofix and user-request workflows merely because their syntax is similar. They have different authorization, intent, result and commit semantics.

Target: CCN <= 8, no method > 50 NLOC, all failure modes explicit, no duplicated provider invocation only if a genuine shared agent execution contract already exists.

### Task 12: Complete pull-request thread and lifecycle edges

**Objective:** Remove remaining uncovered branches and evaluate real nesting after tests.

**Files:**

- Update: `src/data/repository/__tests__/pull_request_review_thread_repository.test.ts`
- Update: `src/data/repository/__tests__/pull_request_lifecycle_repository.test.ts`
- Modify production only if tests reveal a separable mapper/pagination policy.

Do not refactor a fully characterized adapter if its remaining score is historical churn or deliberate provider branching.

## 7. Composition and entrypoint proof

### Task 13: Direct composition-root wiring tests

**Objective:** Ensure every significant root proves capability binding and sharing identity.

**Files to audit/test:**

- `src/infrastructure/composition/issue_use_case_composition_root.ts`
- `src/infrastructure/composition/pull_request_use_case_composition_root.ts`
- `src/infrastructure/composition/project_board_composition_root.ts`
- `src/infrastructure/composition/release_composition_root.ts`
- `src/infrastructure/composition/main_run_route_composition_root.ts`
- matching tests under `src/infrastructure/composition/__tests__/`.

Each test must verify more than “is a function”:

- exact use-case class bound;
- exact specialized adapter class bound;
- intended shared identity;
- intended distinct identity;
- provider client created once per lifecycle where required;
- query/command clients are not accidentally unified.

### Task 14: Entrypoint lifecycle coverage

**Objective:** Cover remaining branches without splitting legitimate roots.

**Files:**

- Update: `src/actions/__tests__/github_action.test.ts`
- Update: `src/actions/__tests__/common_action.test.ts`
- Update: `src/actions/__tests__/local_action.test.ts`
- Exercise: `src/actions/github_action.ts`, `common_action.ts`, `local_action.ts`

No split is allowed solely because `github_action.ts` has 167 NLOC or `common_action.ts` has historical churn. Extract only pure input policy or a semantic lifecycle step with independent tests.

## 8. Coverage closure to 100%

### Task 15: Generate current uncovered-line inventory

**Objective:** Replace the historical coverage backlog with exact current evidence.

Commands:

```bash
METRICS_OUTPUT_DIR="$(mktemp -d "/tmp/copilot-architecture-metrics-$(git rev-parse HEAD)-XXXXXX")" \
  pnpm run metrics:architecture
```

Use the generated `coverage-inventory.json`, derived directly from the emitted
`coverage/lcov.info`. Do not require `coverage-summary.json`; the repository's
Jest configuration does not emit that reporter.

Create a table containing every production file below 100%, its LCOV
line/branch/function totals, uncovered line/function identifiers, current focused
test, missing behavior and decision (`test`, `classify`, or `remove after caller
proof`). Keep the Jest statement percentage as a global gate; do not fabricate a
per-file statement field that the emitted LCOV does not contain.

Never write import-only tests for type-only declarations or constants. Prefer testing behavior through its owner.

### Task 16: Close application coverage

Work capability by capability, not percentage-only:

1. application policies;
2. leaf use cases;
3. orchestrator transition matrices;
4. bugbot workflows;
5. setup/release/hotfix flows;
6. error and no-op branches.

Every new test must assert an observable contract, interaction or state transition.

### Task 17: Close adapter coverage

Cover all specialized GitHub, Git, process, filesystem, logging and timing adapters. Use fakes/mocks at the provider edge; never use real credentials or mutate a real repository.

### Task 18: Close entrypoint and utility coverage

Cover deterministic input parsing, lifecycle cleanup, failure mapping and bounded polling. For process/server tests use isolated fake executables and fake timers.

### Task 19: Enforce thresholds gradually

Modify Jest thresholds only after current values pass:

```text
90 -> 95 -> 98 -> 100
```

Each threshold increase is its own verified block. Never lower an enforced threshold.

## 9. Duplication and marker triage

### Task 20: Classify all critical/high findings

Export RepoWise JSON and classify each current critical/high finding as:

- `actionable-static`;
- `missing-contract`;
- `legitimate-boundary`;
- `test-fixture-duplication`;
- `generated-release-history`;
- `recent-migration-history`;
- `tool-false-positive`;
- `requires-observation-window`.

For each classification record SHA, evidence, callers and review date. Do not commit raw RepoWise output; commit only concise durable decisions.

### Task 21: Review semantic duplication

Priority candidates:

- repeated project board GraphQL paging;
- repeated provider error mapping where semantics match;
- repeated issue/PR project-link result behavior;
- repeated prompt template structure;
- repeated logger formatting.

Extract only if ownership, inputs, outputs and failure behavior are genuinely shared. Do not combine issue and pull-request behaviors merely to reduce clone percentages.

### Task 22: Keep tests readable

High duplicated-test percentages are not automatically defects. Use table-driven tests or fixture builders only when they preserve explicit scenario names and assertions. Reject generic mega-fixtures that make contract failures opaque.

## 10. Performance findings

### Task 23: Audit all 17 performance findings

For each finding, record bound, expected cardinality, required ordering and whether parallelism is safe.

Known caution:

- polling loops such as `waitForHealthy` and workflow/check waiting are intentionally serial because each iteration observes changing external state;
- converting them to `Promise.all` would be behaviorally wrong even if RepoWise suggests serial-await optimization;
- N+1 findings are actionable only where iterations are independent and provider rate limits/ordering permit batching.

Target: performance 10.0 or every remaining finding classified with an executable bound/contract test.

## 11. Release/tag correctness track

The previously postponed release/tag adapter audit remains mandatory and independent from metric hotspots.

### Task 24: Audit release and tag capabilities

**Files:**

- `src/application/ports/github_release_ports.ts`
- `src/application/ports/repository_release_ports.ts`
- `src/data/repository/release/repository_default_branch_repository.ts`
- `src/data/repository/release/repository_release_publication_repository.ts`
- `src/data/repository/release/repository_tag_repository.ts`
- `src/infrastructure/github/octokit_release_adapters.ts`
- `src/infrastructure/composition/github_release_client_factory.ts`
- `src/infrastructure/composition/release_composition_root.ts`

Inventory callers and add contract tests before changing boundaries. Keep default-branch query, tag mutation and release publication separate if their permissions/failure semantics differ.

## 12. Executable architecture guards

### Task 25: Complete dependency rules

Add/strengthen tests that eventually fail for:

- application importing infrastructure, manager concretes, data repositories, `@actions`, filesystem/process or unallowlisted provider protocol paths;
- dispatchers importing composition or concrete factories;
- new provider protocols placed in application;
- composition roots imported by use cases;
- query/command provider clients reunited into universal clients;
- production cycles;
- retired facade names or compatibility shims returning.

Current SDK-shaped `Github*Client` contracts under
`src/application/ports/github_*_ports.ts` are a transitional allowlist, not proof
of target compliance. Before enforcing zero provider protocols in application:

1. inventory each current contract and every productive caller;
2. distinguish semantic application capabilities from provider transport shapes;
3. move only provider-shaped contracts to capability-specific infrastructure
   protocol modules;
4. migrate composition and specialized adapters without compatibility re-exports;
5. keep focused tests green and shrink the allowlist after each migration;
6. enforce zero only when the allowlist is empty.

Use explicit path/symbol allowlists for intentional transitional imports rather
than suffix-only regexes.

### Task 26: Prove zero references before removal

Every deletion requires:

```bash
rg 'RemovedSymbol|removed_file_stem' src docs action.yml package.json
```

plus caller inventory, focused tests and build. Builders/facades with legitimate callers remain.

## 13. Per-block execution protocol

For every approved block:

1. Verify the hotspot still exists on current `master`.
2. Record baseline SHA and clean tree.
3. Inspect direct callers and productive paths.
4. Inspect focused tests and coverage.
5. Write RED contract test.
6. Run focused test and confirm the expected failure.
7. Implement minimum semantic change.
8. Run focused test to GREEN.
9. Refactor with all focused tests GREEN.
10. Run TypeScript and ESLint.
11. Run affected architecture guards.
12. Re-measure focused health; do not claim global improvement from a partial scan.
13. Run full Jest and coverage.
14. Run build, audit and `git diff --check`.
15. Regenerate Graphify using only the authorized command.
16. Update RepoWise index and ingest coverage.
17. Request independent architecture and behavioral review.
18. Apply real findings and repeat gates.
19. Restore/remove generated artifacts.
20. Create one atomic commit and normal push.
21. Fetch and prove local/tracking/remote SHA equality and clean tree.

Required commands:

```bash
pnpm exec jest <focused-tests> --runInBand
pnpm exec tsc --noEmit
pnpm run lint
pnpm exec jest --runInBand
pnpm run build
pnpm audit --prod --audit-level=high
git diff --check
METRICS_OUTPUT_DIR="$(mktemp -d "/tmp/copilot-architecture-metrics-$(git rev-parse HEAD)-XXXXXX")" \
  pnpm run metrics:architecture
git diff --check
```

Publication proof:

```bash
git push origin master
git fetch origin
head_sha="$(git rev-parse HEAD)"
tracking_sha="$(git rev-parse origin/master)"
remote_sha="$(git ls-remote origin refs/heads/master | cut -f1)"
test "$head_sha" = "$tracking_sha"
test "$head_sha" = "$remote_sha"
test -z "$(git status --porcelain)"
```

## 14. Phase ordering

Execute only after documentation approval:

1. Documentation stabilization and reproducible metric protocol.
2. Project board command/query contract coverage.
3. Branch preparation and linked-branch contract coverage.
4. Issue provisioning/title/type contract coverage.
5. Pull-request review contract coverage.
6. Merge polling semantic decomposition.
7. Member assignment policy decomposition.
8. Bugbot autofix complexity audit.
9. Remaining PR lifecycle/thread contracts.
10. Composition-root and entrypoint proof.
11. Release/tag correctness track.
12. Coverage closure 90 -> 95 -> 98 -> 100.
13. Critical/high finding classification and justified semantic duplication cleanup.
14. Performance finding audit.
15. Final architecture guards and complete publication gates.
16. Historical-signal observation window and mature RepoWise checkpoint.

## 15. Final acceptance checklist

### Architecture

- [ ] No forbidden inward dependency.
- [ ] No production dependency cycle.
- [ ] Every runtime has one explicit lifecycle composition root.
- [ ] Every application port is semantic.
- [ ] Every provider protocol is outside application; until the documented
      `Github*Client` transitional allowlist is migrated, the allowlist is explicit
      and cannot grow.
- [ ] Query and command capabilities remain appropriately separated.
- [ ] No universal factory/client/repository or compatibility shim exists.
- [ ] Every retained facade/builder has current legitimate callers and tests.

### Behavior and tests

- [ ] Every specialized adapter has focused contract coverage.
- [ ] Every workflow has success/no-op/failure/boundary tests.
- [ ] All polling uses injectable delay or bounded, testable timing at the correct layer.
- [ ] Pagination and nullable provider responses are tested.
- [ ] Jest reaches defensible 100% on behavior-bearing production code.
- [ ] No meaningless coverage-only tests exist.

### RepoWise

- [ ] Index SHA equals published HEAD.
- [ ] Coverage is ingested before health.
- [ ] Average health meets immediate/mature target.
- [ ] Hotspot health meets immediate/mature target.
- [ ] Worst production file meets target.
- [ ] No production alert remains.
- [ ] Dead-code safe/unreachable/unused export counts are zero.
- [ ] Every critical/high finding is resolved or classified.
- [ ] Remaining history-derived findings have an observation date.

### Graphify and boundaries

- [ ] Current graph is regenerated.
- [ ] High-degree nodes are semantically justified.
- [ ] No removed universal facade returns.
- [ ] Directed dependency/cycle claims come from executable guards, not undirected Graphify output.

### Publication

- [ ] Focused and global gates pass.
- [ ] Independent architecture review passes.
- [ ] Independent behavioral/test review passes.
- [ ] Build artifacts are managed only by the release/hotfix policy.
- [ ] RepoWise, Graphify, coverage, editor and MCP outputs are absent.
- [ ] Atomic commit is pushed normally.
- [ ] `HEAD == origin/master == remote master`.
- [ ] Working tree is clean.

## 16. Risks and mitigations

| Risk                                           | Mitigation                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| Optimizing metric noise                        | Require caller, behavior, contract or ownership evidence before every change         |
| Lowering clarity through generic helpers       | Require shared semantics and failure behavior; reject syntax-only extraction         |
| Chasing historical churn                       | Separate immediate controllable and mature rolling-window targets                    |
| Inflating coverage with meaningless tests      | Assert observable contracts; classify declarations rather than import-only execution |
| Breaking GitHub behavior                       | Provider fakes, contract matrices, pagination/nullable/error tests, build gate       |
| New god composition root                       | Capability-specific roots and direct wiring identity tests                           |
| Reintroducing technical ports into application | Architecture allowlists and provider-protocol location guards                        |
| False performance optimization of polling      | Document serial state dependence and bounded retry contracts                         |
| Generated artifacts leaking into Git           | Mandatory cleanup and final porcelain-byte check                                     |
| Stale documentation                            | One authoritative plan; volatile measurements stored once with SHA/timestamp         |

## 17. Resolved execution decisions

Efra approved execution on 2026-08-20. The documentation block resolves the
former open decisions as follows:

1. `docs/total-architecture-reconstruction-plan.md` remains the historical master
   architecture plan and links to this specialized authoritative companion for
   all remaining quality work.
2. `docs/COVERAGE_ACTION_PLAN.md` is fully replaced by the current LCOV-backed
   inventory; the obsolete backlog is not retained as active guidance.
3. The 100% target applies to behavior-bearing production TypeScript. Generated
   bundles, declarations, test files and explicitly classified non-executable
   type-only surfaces are excluded; every exclusion must be visible in Jest
   configuration or documented with evidence.
4. The P0 project-board and branch contract blocks precede the release/tag
   correctness audit. Release/tag remains mandatory and follows them; it is not
   displaced by cosmetic metric work.
5. No RepoWise exclusion is adopted now. A supported exclusion may be considered
   only after checking the installed version and proving a concrete false
   positive; unsupported ignore semantics are forbidden.
6. Mature history-derived acceptance uses RepoWise's 90-day observation window.
   Immediate controllable gates remain mandatory after every block.

These decisions are final for this execution plan. Production implementation may
begin only after the documentation commit containing them is published and
verified remotely.
