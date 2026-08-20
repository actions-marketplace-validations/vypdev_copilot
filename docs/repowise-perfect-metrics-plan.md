# RepoWise Near-Perfect Metrics and Clean Architecture Execution Plan

> **For Hermes:** Implement this plan one vertical slice at a time using `quality-first-repository-development`, `test-driven-development`, `iterative-hotspot-refactoring`, and `requesting-code-review`. Do not implement production code until Efra approves this documented revision. Every production change starts with an observed RED test and ends with focused/global gates, a reproducible metrics record, review, atomic commit, normal push, remote-SHA equality, and a clean tree.

**Status:** Planning-only revision, documented on 2026-08-20 against published `master` at `df23de8ed9e309ae23e17656aeb8cacbfe7e2160`. No production or test implementation belongs to this planning block.

**Goal:** Make `vypdev/copilot` a reference-quality Clean Architecture repository, drive every controllable RepoWise and coverage metric to its defensible maximum, eliminate real hotspots and boundary debt, and classify history-derived or tool-derived signals without manipulating source layout or Git history.

**Architecture:** Preserve and strengthen `entrypoint -> lifecycle composition root -> application use case/policy -> semantic application port -> specialized outer adapter -> provider protocol/client`. Characterize behavior before changing boundaries. Move policy inward only when it is provider-neutral; keep transport, SDK DTOs, GraphQL documents, pagination mechanics, filesystem, process and timing implementations outside application. Query and command capabilities remain separate when they have different semantics, permissions or callers.

**Tech stack:** TypeScript 5.9, Jest, ESLint, pnpm only, NCC, RepoWise 0.42.0, Graphify 0.9.46, GitHub REST/GraphQL adapters.

---

## 1. Non-negotiable definition of success

Near-perfect RepoWise metrics are an outcome of correct architecture and verified behavior, not the optimization target of individual edits.

### 1.1 Mandatory architecture rules

1. `src/application` must not depend on infrastructure, concrete repositories, SDK/provider mechanics, managers, filesystem, processes, CLI, `@actions/*`, GraphQL documents or REST DTOs.
2. Application ports express semantic capabilities. They do not expose `rest.*`, `graphql`, pagination iterators, HTTP verbs or universal clients.
3. The temporary `Github*Client` contracts under `src/application/ports/github_*_ports.ts` are a shrinking allowlist, not target architecture. It cannot grow.
4. Every lifecycle delegates concrete assembly to a named composition root. Entrypoints coordinate; they do not instantiate adapters inline.
5. Query and command capabilities remain separated when behavior, permission or callers differ.
6. Use cases receive all collaborators through constructors or explicit function parameters. No hidden concrete defaults or service locators.
7. Provider protocol types and SDK-shaped contracts live in infrastructure.
8. No `RepositoryFactory`, universal repository/client, registry facade, compatibility shim, alias or cosmetic coordinator may be introduced.
9. A builder or facade is removed only after productive callers are audited, migrated, tested and proven to have zero references.
10. No production dependency cycle or forbidden inward dependency may remain.
11. Every adapter touched by the plan must cover pagination, nullable data, malformed responses, no-op behavior and provider failures that it can encounter.
12. Every application policy/use case touched by the plan must cover success, no-op, failure and boundary transitions deterministically.

### 1.2 Numeric acceptance targets

Immediate controllable release target:

```text
Average health >= 9.0
Hotspot health >= 8.0
Worst production file >= 7.5
Maintainability average >= 9.7
Performance = 10.0, or every remaining finding has a legitimate bounded classification
Production alert volume = 0%
Behavior-bearing production lines = 100%
Behavior-bearing production branches = 100%
Behavior-bearing production functions = 100%
Safe dead code / unreachable production / unused production exports = 0
Forbidden application imports = 0
Production dependency cycles = 0
```

Mature target after RepoWise's rolling history window stabilizes:

```text
Average health >= 9.5
Hotspot health >= 9.0
Worst production file >= 8.5
No unclassified critical/high history-derived findings
```

A literal historical `10.0` is aspirational. It is not permission to rewrite Git history, create no-op commits, fragment coherent files, merge semantically distinct capabilities, delete legitimate composition roots or suppress evidence.

### 1.3 Rejected metric tactics

Reject a change whose only justification is file score, NLOC, marker count, clone syntax, recent churn, co-change after an atomic migration or RepoWise's generic `extract_helper` suggestion. Every accepted change must resolve at least one current behavior gap, semantic boundary defect, ownership ambiguity, provider-contract defect, verified complexity problem or meaningful duplication.

`RepoWise near-perfect` does not mean `architecture perfect`, `coverage 100% without judgment`, or `zero historical churn`.

## 2. Reproducible published baseline

### 2.1 Provenance

```text
Repository: vypdev/copilot
Branch: master
Published SHA: df23de8ed9e309ae23e17656aeb8cacbfe7e2160
Measured: 2026-08-20
Collector: pnpm run metrics:architecture
RepoWise: 0.42.0
Graphify: 0.9.46
```

Two independent records for the same SHA completed successfully in distinct external directories. Both published valid `complete.json`, restored protected mutable paths, left the working tree clean and produced identical principal health values.

### 2.2 Quality gates

```text
Jest suites: 221 passed / 221 total
Tests: 1395 passed, 1 skipped
TypeScript: PASS
ESLint: PASS
NCC build: PASS
Production audit: PASS — no known vulnerabilities
Prettier: PASS
Git diff check: PASS
Static secret/security scan: PASS
HEAD == origin/master == remote master: PASS
Working tree clean: PASS
```

### 2.3 Coverage

```text
LCOV files: 330
Lines: 5867 / 6771 = 86.65%
Jest branches: 2346 / 2925 = 80.21%
Functions: 935 / 1109 = 84.31%
RepoWise branch aggregation: 77.15%
```

Jest and RepoWise branch percentages use different aggregation/mapping rules and must remain separately labelled.

### 2.4 RepoWise health

```text
Files scored: 718
Average health: 8.07
Hotspot health: 5.52
Worst production file: project_board_command_repository.ts = 1.95
Maintainability average: 9.22
Maintainability hotspot: 8.61
Performance average: 9.99
Performance hotspot: 9.99
Safe dead-code findings: 0
```

Score distribution:

```text
Score >= 7: 613 files
Score 4..<7: 89 files
Score < 4: 16 files
```

RepoWise emitted 1,426 raw findings (`54 critical`, `261 high`, `764 medium`, `347 low`). This is not a backlog of 1,426 source edits: one file can have multiple static and historical biomarkers. Every critical/high finding requires resolution or evidence-backed classification.

### 2.5 Graphify

```text
Nodes: 3367
Edges: 8537
Communities: 228
```

Graphify's current graph is useful for navigation and community evidence. It is not authority for dependency direction or cycle absence; executable directed-import guards and source inspection are authoritative.

## 3. Current hotspot and boundary audit

| Order | Current file                                                                 |             Score | Current defect/gap                                                                                                                       | Planned treatment                                                                                                                       |
| ----: | ---------------------------------------------------------------------------- | ----------------: | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
|  P0.1 | `src/data/repository/project/project_board_command_repository.ts`            |              1.95 | 20.75% lines, 0% branches; field discovery, item pagination and mutation in one path; missing-item behavior is unsafe to assume          | Characterize command contract, correct behavior defects, then extract only semantic policy/protocol boundaries justified by tests       |
|  P0.2 | `src/data/repository/project/project_board_query_repository.ts`              |              2.80 | 0% recognized coverage; project identity, content lookup and link scan; implements two query ports; SDK-shaped identity contracts        | Complete query matrix, audit caller sets, preserve query/command split, migrate technical contracts out of application                  |
|  P0.3 | `src/data/repository/branch/branch_preparation_repository.ts`                |              2.58 | 0% coverage; broad aggregate port; delegates Git, naming and linked-branch adapters; mixes provider paging with branch transition policy | Characterize behavior, partition semantic ports, move provider-neutral decision policy inward, remove aggregate only after zero callers |
|  P0.4 | `src/data/repository/branch/linked_branch_repository.ts`                     |              2.62 | 0% coverage; raw GraphQL query/mutation and result mapping; interpolated ref                                                             | Complete contract, use variables for provider input when verified, expose a semantic command port                                       |
|  P0.5 | `src/data/repository/issue/issue_label_provisioning_repository.ts`           |              2.61 | 19.05% lines, 0% branches; only first 100 labels; repeated listing through `ensureLabel` can become N+1                                  | Add contract matrix, paginate once, separate pure case-insensitive selection from provider effects if useful                            |
|  P0.6 | `src/data/repository/pull_request/pull_request_review_repository.ts`         |              2.70 | 0% recognized coverage; reviewer membership, comment query/mutation and thread delegation grouped; constructs thread adapter internally  | Characterize per capability, audit method callers, inject specialized thread port, split only closed capability graphs                  |
|  P0.7 | `src/data/repository/merge_repository.ts`                                    |              2.82 | CCN 16, nesting 6, 206+ NLOC; polling policy, PR lifecycle and direct fallback mixed                                                     | Extract provider-neutral bounded wait use case/policy and delay port; keep GitHub DTO mapping in adapter                                |
|  P1.1 | `src/data/repository/pull_request/pull_request_lifecycle_repository.ts`      |              2.90 | Partial behavior coverage and high duplication signal                                                                                    | Complete edge contracts; refactor only verified semantic duplication                                                                    |
|  P1.2 | `src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts`    |              3.15 | CCN 13 and orchestration complexity                                                                                                      | Complete transition matrix, extract semantic policy only where provider-neutral                                                         |
|  P1.3 | `src/application/usecases/steps/issue/assign_members_to_issue_use_case.ts`   |              3.46 | CCN 17; selection and orchestration mixed                                                                                                | Pure deterministic member-selection policy plus thin use-case orchestration                                                             |
|  P1.4 | `src/application/usecases/steps/commit/check_changes_issue_size_use_case.ts` |              3.46 | CCN 9, nesting 4                                                                                                                         | Branch tests first, then optional pure decision table                                                                                   |
|  P1.5 | `src/actions/local_action.ts`                                                | history-sensitive | Constructs `GitCliRepository` inline; reopened Phase D exit criterion                                                                    | Create a named local lifecycle composition root after P0 capability migrations                                                          |

Explicit non-targets unless new current evidence appears:

- `src/actions/main_run_dispatcher.ts`: pure dispatcher; historical churn is not a current defect.
- `src/cli.ts`: legitimate bootstrap.
- specialized composition roots: construction is their purpose; test wiring rather than fragmenting them.
- generated NCC bundles and local RepoWise/Graphify artifacts.
- builders/facades that retain audited productive callers.

## 4. Target capability topology

### 4.1 Project Board

Keep semantic application contracts separate:

- project detail query;
- project content/item query;
- content link command;
- single-select board command.

The target does **not** combine these into a `ProjectBoardRepository`. The composition root may share an identical content-query adapter instance with link and command capabilities and must prove that identity in its wiring test. Raw GraphQL response types, owner lookup SDK shapes and provider-client resolution remain outside application.

A current class may implement two semantic query ports only if the post-test caller audit proves one cohesive reason to change. Otherwise migrate to two specialized adapters without a compatibility facade.

### 4.2 Branch preparation

Replace the current broad `BranchPreparationPort extends BranchLifecyclePort, BranchNamePort` topology through staged caller migration. Target capabilities are:

- remote branch inventory query;
- local Git workspace preparation/tag query;
- pure issue-branch preparation decision policy;
- linked-branch command;
- branch deletion/lifecycle command;
- branch-name policy.

The application owns provider-neutral decisions: target name, base selection, hotfix validation, previous-branch transition and parent-branch preservation. GitHub listing/deletion, GraphQL linked-branch mutation and Git CLI execution remain specialized outer adapters. Do not retain the old aggregate as a forwarding shim.

### 4.3 Issue label provisioning

`IssueLabelProvisioningPort` is already semantic and should remain. The outer adapter owns paginated provider inventory and mutation. A pure policy may compare required and existing labels case-insensitively. One provisioning execution should obtain a complete inventory once and then perform only required mutations, while preserving the existing `422 already exists` race behavior.

### 4.4 Pull-request review

Treat these as candidate independent capabilities, subject to caller proof:

- reviewer membership query/command;
- review-comment query;
- review-comment command;
- review-thread command.

Do not construct `PullRequestReviewThreadRepository` inside another adapter. Inject its semantic port from a composition root. Do not create a universal pull-request review facade after splitting.

### 4.5 Merge

Application may own a bounded `wait for merge readiness` policy only over provider-neutral check/status states. The outer GitHub adapter owns PR creation/update/merge, DTO mapping and direct merge fallback. Timing is injected through a narrow delay port. Polling remains serial because each iteration observes changing external state.

### 4.6 Lifecycle composition

`runLocalAction()` must delegate adapter assembly to a named `local_action_composition_root.ts`. The entrypoint may coordinate configuration, execution and rendering, but must not instantiate `GitCliRepository` or other concrete adapters.

## 5. Execution protocol for every implementation block

1. Fetch `origin/master`; prove local/tracking/remote alignment and a clean tree.
2. Confirm the target remains a hotspot in a fresh reproducible record.
3. Audit productive callers, test-only callers, composition roots and current ports.
4. Record behavior and compatibility constraints.
5. Write one RED test for one observable contract.
6. Run only that test and confirm the expected behavioral failure, not a syntax/setup failure.
7. Implement the smallest GREEN change.
8. Re-run focused tests.
9. Refactor only while GREEN; do not expand scope.
10. Search forbidden imports and old symbols.
11. Run TypeScript, ESLint and affected architecture guards.
12. Run all Jest suites, build, audit and diff check.
13. Obtain independent behavioral and architecture review.
14. Apply valid findings and repeat gates.
15. Commit and push one atomic vertical slice.
16. Prove `HEAD == origin/master == remote master` and tree clean.
17. At the end of each phase, run the external metrics collector twice only when reproducibility or a collector change requires it; otherwise one complete record is sufficient.
18. Compare exact machine-readable metrics and update this plan's ledger without committing raw reports.

Required gates:

```bash
pnpm exec jest <focused-test> --runInBand
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

Generated `build/`, `coverage/`, `graphify-out/`, `.repowise/`, editor, agent and MCP artifacts must never enter a source commit. Restore only known generated paths after checking context; never perform indiscriminate cleanup.

## 6. Phase 0 — Metric protocol closure

**Status:** Complete and published at `df23de8ed9e309ae23e17656aeb8cacbfe7e2160`.

Delivered:

- strict LCOV inventory and JSON validation;
- RepoWise single-repository scope and real LCOV ingestion;
- Graphify record;
- unique external output per run;
- canonical path/symlink guards;
- fail-closed mutable-path symlink checks;
- byte-preserving workspace snapshot/restoration;
- bounded process-group timeouts and `SIGINT`/`SIGTERM` handling;
- complete marker only after restoration and postchecks;
- SHA, scope, executables, versions, output path, timeouts and argv provenance.

No collector work is authorized during hotspot phases unless a reproducible defect is demonstrated first.

## 7. Phase 1 — Project Board vertical slice

### Task 1.1: Freeze caller and behavior contracts

**Files to inspect:**

- `src/application/ports/project_board_command_ports.ts`
- `src/application/ports/project_board_query_ports.ts`
- `src/application/ports/project_board_link_ports.ts`
- `src/data/repository/project/project_board_*_repository.ts`
- `src/infrastructure/composition/project_board_composition_root.ts`
- all `ProjectBoard*Port` productive callers.

**Deliverable:** A caller matrix in the implementation commit description identifying which lifecycle consumes query, link, content query and command. No production change.

### Task 1.2: Command contract — strict TDD

**Create:** `src/data/repository/project/__tests__/project_board_command_repository.test.ts`

RED→GREEN scenarios, one at a time:

1. missing content ID rejects before field query/mutation;
2. field missing;
3. option missing;
4. current option already selected returns `false` without mutation;
5. item found on the first page;
6. item found on a later page;
7. item absent after the final page must not mutate with a content-node ID;
8. `hasNextPage=true` with null cursor terminates safely;
9. nullable/malformed field and item nodes;
10. successful mutation returns `true` only with a proven `projectV2Item`;
11. nullable mutation returns `false`;
12. priority/size/status map to exact semantic field names;
13. provider error preserves the established error boundary;
14. client/token resolution frequency is explicit.

**Focused gate:**

```bash
pnpm exec jest src/data/repository/project/__tests__/project_board_command_repository.test.ts --runInBand
```

### Task 1.3: Query contract — strict TDD

**Create:** `src/data/repository/project/__tests__/project_board_query_repository.test.ts`

**Retire or relocate only after coverage equivalence:** `src/data/repository/project/project_board_repository.test.ts`

Scenarios:

- invalid project number;
- organization and user owners;
- owner lookup failure;
- GraphQL project failure;
- project absent;
- issue/PR content absent;
- null project node;
- first/later page content match;
- content absent after all pages;
- null cursor while `hasNextPage=true`;
- 100-page safety boundary;
- nullable content nodes;
- `isContentLinked` first/later/absent and malformed pagination.

### Task 1.4: Semantic boundary migration

Only after Tasks 1.2–1.3 are GREEN:

1. classify the two query interfaces by caller and reason to change;
2. keep one implementation only if cohesion is proven;
3. otherwise create specialized query adapters and migrate the closed caller graph;
4. move Project Board-specific SDK/provider response contracts out of `src/application`;
5. keep raw GraphQL documents in the specialized outer adapter;
6. replace interpolated provider values with GraphQL variables where supported;
7. preserve command/query separation;
8. remove old implementation only after zero references;
9. update `project_board_composition_root.test.ts` to prove intended sharing and distinct client construction.

**Forbidden:** `ProjectBoardRepository`, a universal GraphQL helper, compatibility re-export, or a coordinator whose only purpose is lowering NLOC.

**Phase exit:** touched Project Board behavior-bearing files at 100% lines/branches/functions; no unclassified command/query correctness defect; no application import of new provider mechanics; worst Project Board score remeasured, not predicted.

## 8. Phase 2 — Branch Preparation and Linked Branch vertical slice

### Task 2.1: Characterize current aggregate

**Create:**

- `src/data/repository/branch/__tests__/branch_preparation_repository.test.ts`
- `src/data/repository/branch/__tests__/linked_branch_repository.test.ts`

Branch preparation scenarios:

- complete pagination until an empty page;
- remote fetch and tag lookup delegation;
- missing hotfix base;
- target branch already exists;
- previous issue branch selected as rename base;
- hotfix base selection;
- parent branch preservation during rename;
- exact linked-branch request;
- provider error mapping;
- deletion success/failure;
- wrapper argument preservation before wrappers are retired.

Linked branch scenarios:

- normal head ref and tag-qualified ref;
- ref containing quotes/backslashes;
- explicit OID override;
- missing repository ID, issue ID or OID;
- successful mutation and URL payload;
- nullable mutation response;
- query and mutation failures.

### Task 2.2: Introduce provider-neutral decision policy

**Candidate create, after RED proves the desired API:**

- `src/application/policies/branch_preparation_policy.ts`
- `src/application/policies/__tests__/branch_preparation_policy.test.ts`

The pure policy accepts branch names and semantic issue/hotfix configuration and returns a decision containing target name, base name, rename state and parent-branch update. It must not accept `Execution`, SDK DTOs, tokens, Git clients or repositories.

### Task 2.3: Partition the aggregate port

**Modify:** `src/application/ports/branch_preparation_ports.ts` and productive callers.

1. introduce the smallest semantic ports proven by callers;
2. migrate one caller/use-case path at a time;
3. keep Git CLI, GitHub branch inventory and linked GraphQL command as separate adapters;
4. move orchestration to an application use case only when all inputs/results are provider-neutral;
5. update `issue_use_case_composition_root.ts` explicitly;
6. prove wiring with a focused composition-root test;
7. delete `BranchPreparationRepository` and broad `BranchPreparationPort` only after zero productive/test references;
8. do not leave delegating methods or aliases.

**Phase exit:** no adapter depends on `GitCliRepository`, `BranchNameRepository` or `LinkedBranchRepository` concrete types; no broad inherited branch aggregate remains; all branch transition and provider edge behavior is covered; scores remeasured honestly.

## 9. Phase 3 — Issue label provisioning

### Task 3.1: Complete the contract

**Create:** `src/data/repository/issue/__tests__/issue_label_provisioning_repository.test.ts`

RED→GREEN scenarios:

- empty/blank name no-op;
- case-insensitive existing label;
- labels beyond the first 100 are observed;
- creation success;
- `422 already exists` race maps to `existed`;
- other provider errors propagate from `ensureLabel`;
- `ensureLabels` aggregates created/existing/errors exactly;
- one complete inventory per provisioning execution;
- nullable descriptions preserved;
- duplicate required labels do not create duplicate mutations.

### Task 3.2: Remove N+1 behavior semantically

Use provider pagination in the outer adapter. If useful, create a pure label comparison policy under `src/application/policies/`; otherwise keep a small private pure function local. Do not introduce a universal pagination service.

**Phase exit:** 100% behavior coverage, complete pagination, no repeated inventory request per required label, `IssueLabelProvisioningPort` remains semantic.

## 10. Phase 4 — Pull-request review capabilities

### Task 4.1: Contract coverage

**Create:** `src/data/repository/pull_request/__tests__/pull_request_review_repository.test.ts`

Cover reviewer deduplication, errors, empty requests, pagination, nullable comment fields, single-comment lookup, review-thread delegation, empty comment creation, partial/all failure in `Promise.allSettled`, and update mutation.

### Task 4.2: Caller-based partition

Audit every method caller. If caller sets and permissions differ, migrate closed capability graphs to reviewer membership, comment query, comment command and thread command ports/adapters. Inject the thread command port from composition; never construct a concrete thread repository internally. Keep one adapter if caller evidence proves one cohesive capability.

**Phase exit:** no hidden adapter construction; all provider edges covered; no universal review facade; touched files at 100% behavior coverage.

## 11. Phase 5 — Merge polling and fallback

### Task 5.1: Freeze existing behavior

Extend `src/data/repository/__tests__/merge_repository.test.ts` for PR creation/update payloads, PR-specific check selection, pending/failed checks, registration grace, status fallback, exact timeout and direct-merge fallback semantics.

### Task 5.2: Extract bounded readiness policy

**Candidate create:**

- `src/application/ports/merge_wait_ports.ts`
- `src/application/usecases/merge/wait_for_pull_request_checks_use_case.ts`
- `src/application/usecases/merge/__tests__/wait_for_pull_request_checks_use_case.test.ts`
- `src/infrastructure/time/timer_merge_polling_delay_adapter.ts`
- `src/infrastructure/composition/merge_composition_root.ts`

Only provider-neutral check/status states cross into application. No SDK DTO or GitHub client may enter the use case. Delay is injected; unit tests never sleep. GitHub PR lifecycle and direct fallback remain specialized outer behavior.

**Target:** `merge_repository` max CCN <= 8, nesting <= 3, no real-time unit-test delay, exact fallback compatibility.

## 12. Phase 6 — Local lifecycle composition closure

**Create:**

- `src/infrastructure/composition/local_action_composition_root.ts`
- `src/infrastructure/composition/__tests__/local_action_composition_root.test.ts`

**Modify:** `src/actions/local_action.ts`

The named root returns the already-assembled semantic capabilities needed by configuration and `mainRun`. `runLocalAction()` retains coordination and rendering, but no longer executes `new GitCliRepository()` or constructs other adapters inline.

**Exit:** executable architecture guard proves all lifecycle entrypoints delegate concrete assembly; `cli.ts` remains a legitimate bootstrap.

## 13. Phase 7 — Remaining real complexity hotspots

Execute in this order, one vertical slice per commit:

1. `pull_request_lifecycle_repository.ts`: complete nullable/error/pagination branches; refactor only if a semantic split remains.
2. `assign_members_to_issue_use_case.ts`: extract a pure deterministic member-selection policy; target CCN <= 8.
3. `check_changes_issue_size_use_case.ts`: complete decision-table branches; extract only a provider-neutral policy.
4. `bugbot_autofix_use_case.ts`: characterize workspace safety, provider invocation and result mapping; reject merging with user-request workflows.
5. `issue_title_repository.ts`, `issue_type_repository.ts`, review-thread adapter and other score-<4 files: contract-first, then remeasure.
6. composition-root hotspots: add wiring identity tests; never split by line count.

Every slice must document why the remaining responsibility split is semantic rather than metric-driven.

## 14. Phase 8 — Transitional provider-contract migration

For each allowlisted `src/application/ports/github_*_ports.ts` contract:

1. inventory productive adapters, composition roots and tests;
2. determine whether it represents a semantic application capability or provider protocol;
3. keep/rename semantic capability ports in application;
4. move SDK-shaped transport contracts to capability-specific infrastructure protocol modules;
5. migrate one complete caller graph;
6. remove old exports without aliases/re-exports;
7. shrink the explicit architecture-test allowlist;
8. stop when a capability boundary is not yet proven—never make the allowlist worse merely to claim zero.

Model relocation (for example `ProjectDetail` currently under `src/data/model`) is a separate caller-complete migration, not an incidental path change inside a hotspot block.

**Exit:** provider-protocol allowlist empty, or every temporary survivor has a named owner, callers, blocking reason and next review date; allowlist never grows.

## 15. Phase 9 — Coverage closure

Generate a fresh LCOV inventory after each capability phase. For every behavior-bearing production file below 100%, record uncovered lines/functions, missing behavior and decision (`test`, `remove after caller proof`, or explicit non-executable classification).

Raise enforced thresholds only after the repository already passes them:

```text
90 -> 95 -> 98 -> 100
```

Priority order:

1. P0 specialized adapters;
2. application policies and leaf use cases;
3. workflow transition matrices;
4. entrypoint failure/cleanup boundaries;
5. filesystem/process/timing adapters with isolated fakes;
6. remaining utilities through their behavior owner.

No import-only tests for types/constants, no assertions of mock setup without behavior, and no giant generic fixtures that hide scenario intent.

## 16. Phase 10 — Findings, duplication and performance closure

### 10.1 Critical/high classification

Classify each current critical/high finding as:

- `actionable-static`;
- `missing-contract`;
- `legitimate-boundary`;
- `test-fixture-duplication`;
- `generated-release-history`;
- `recent-migration-history`;
- `tool-false-positive`;
- `requires-observation-window`.

Record SHA, source/caller evidence, decision and review date. Commit concise decisions only, never raw RepoWise databases/reports.

### 10.2 Duplication

Extract only genuinely shared ownership, inputs, outputs and failure semantics. Project Board pagination may share a capability-local mechanism if tests prove identical semantics. Do not combine issue and PR workflows, unrelated provider error mappings or prompt templates merely to lower clone percentages.

### 10.3 Performance

Audit all current performance findings. Record iteration bounds, expected cardinality, ordering constraints and whether batching is safe. Serial polling remains serial. N+1 is actionable only when requests are independent and rate/order semantics permit batching.

**Exit:** performance `10.0` or every remaining finding has a bounded executable justification; no actionable N+1 remains.

## 17. Phase checkpoints and stop/go rules

After each phase, update this table from a complete external metrics record:

| Phase    | SHA        |  Avg | Hotspot | Worst | Maintainability | Performance |  Lines |                      Branches | Functions | Files score <4 | Decision                          |
| -------- | ---------- | ---: | ------: | ----: | --------------: | ----------: | -----: | ----------------------------: | --------: | -------------: | --------------------------------- |
| Baseline | `df23de8e` | 8.07 |    5.52 |  1.95 |            9.22 |        9.99 | 86.65% | 80.21% Jest / 77.15% RepoWise |    84.31% |             16 | Proceed to Phase 1 after approval |

Continue only when:

- behavior and architecture gates pass;
- no new forbidden dependency, universal facade or compatibility shim exists;
- touched-file coverage improved through meaningful behavior tests;
- the source change has a semantic reason independent of score;
- review has no unresolved high/medium finding;
- remote and tree are verified.

Stop and stabilize the plan when:

- a caller graph differs from this audit;
- a RED test reveals incompatible historical behavior;
- a proposed port leaks provider mechanics;
- a split requires a compatibility facade;
- metrics improve while dependency direction or clarity worsens;
- RepoWise/Graphify evidence is stale, partial or contaminated;
- another process mutates the checkout during measurement.

## 18. Final acceptance checklist

### Architecture

- [ ] No forbidden inward dependency or production cycle.
- [ ] Every lifecycle has a named composition root.
- [ ] Every application port is semantic.
- [ ] Provider protocol allowlist is empty or every temporary survivor is explicitly governed and shrinking.
- [ ] Query and command capabilities remain appropriately separated.
- [ ] No universal factory/client/repository, alias or compatibility shim.
- [ ] Every retained builder/facade has current productive callers and tests.

### Behavior

- [ ] Every specialized adapter has success/no-op/error/pagination/nullable contract coverage.
- [ ] Every workflow has deterministic transition tests.
- [ ] Polling is bounded and timing is injectable at the correct layer.
- [ ] No meaningless coverage-only test.
- [ ] Defensible 100% behavior-bearing production coverage.

### Metrics

- [ ] Average health >= 9.0 immediate and >= 9.5 mature.
- [ ] Hotspot health >= 8.0 immediate and >= 9.0 mature.
- [ ] Worst production score >= 7.5 immediate and >= 8.5 mature.
- [ ] Maintainability >= 9.7.
- [ ] Performance 10.0 or all survivors classified.
- [ ] Production alert volume 0%.
- [ ] Safe dead code, unreachable production and unused production exports are zero.
- [ ] Every critical/high finding resolved or classified with current evidence.

### Publication

- [ ] Focused and global gates pass.
- [ ] Independent behavioral and architecture reviews pass.
- [ ] Raw RepoWise, Graphify, coverage, editor, MCP and agent artifacts are absent.
- [ ] Atomic commits pushed normally.
- [ ] `HEAD == origin/master == remote master`.
- [ ] Working tree clean.

## 19. Risks and mitigations

| Risk                                                         | Mitigation                                                                            |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Metric optimization degrades architecture                    | Semantic defect/contract evidence required before every source change                 |
| Tests inflate coverage without value                         | One observable behavior per RED; no import-only tests                                 |
| Broad port replaced by cosmetic facade                       | Migrate closed caller graphs and prove zero references; no forwarding shim            |
| Inner layer receives SDK mechanics                           | Explicit boundary tests and shrinking allowlist                                       |
| Project Board query/command reunited                         | Separate ports, clients and composition assertions                                    |
| Branch refactor leaks `Execution` or Git details into policy | Pure decision input/output and specialized outer adapters                             |
| Polling parallelized incorrectly                             | Preserve serial state observation and bounded delay contract                          |
| N+1 remains hidden                                           | Provider call-count tests and complete pagination scenarios                           |
| Composition roots penalized for wiring                       | Add wiring identity tests; do not fragment legitimate roots                           |
| History-derived score causes endless churn                   | Separate immediate controllable and mature observation-window targets                 |
| Generated artifacts leak                                     | Protected collector plus explicit final porcelain check                               |
| Plan becomes stale                                           | Re-audit current checkout before each phase and update only this authoritative ledger |

## 20. Approval boundary

This revision is the stable implementation proposal. It changes documentation only. Production and test implementation begins **only after Efra explicitly approves this revision**. The first executable slice is **Phase 1, Task 1.1–1.2: Project Board caller freeze and command contract TDD**.
