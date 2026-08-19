# Copilot Architecture Perfection Plan

**Status:** Active execution baseline — approved for consecutive phase execution.

**Latest implementation checkpoint:** `29e58cb46e8cd0e223ff16ea53f9003e2fd268f0`

**Completed in the current execution block:** Phases A and B; Phase C audit; first Phase E adapter hardening increment.

**Scope:** Clean Architecture reconstruction, boundary hardening, contract coverage, documentation, and RepoWise/Graphify quality improvement for the current `master` checkout.

**Repository:** `vypdev/copilot`

## 1. Purpose and success definition

This document is the authoritative plan for the remaining architecture work. It supersedes earlier phase plans that were written against older checkouts.

The objective is not merely to lower a RepoWise score or reduce file size. The objective is to make this repository an exemplary Clean Architecture implementation whose structure, dependency graph, contracts, tests, and documentation agree with each other.

Success means:

1. Inner layers depend only on stable semantic contracts and policies.
2. Concrete providers, SDKs, transports, filesystem, process, and Git details remain outside application behavior.
3. Every runtime has an explicit composition root.
4. Every capability has a narrow semantic port and a specialized adapter.
5. Shared code is justified by shared semantics, failure behavior, and ownership—not by similar syntax.
6. Architecture rules are executable and fail when a regression is introduced.
7. RepoWise and Graphify show a healthy, low-risk, low-coupling topology with no unjustified cycles or universal hubs.
8. All remaining structural findings are either resolved or explicitly documented as legitimate boundaries.
9. The complete test, type, lint, build, audit, graph, and publication gates pass.

"Perfect" means architecturally justified and evidence-backed. It does **not** mean zero files, zero duplication, zero composition wiring, or zero RepoWise findings. Legitimate composition roots, adapters, models, and lifecycle coordinators must not be deleted to improve a metric.

## 2. Current evidence

Evidence below is from the current checkout and must be refreshed before each implementation block. Historical reports must not be treated as current facts.

Current published state:

```text
HEAD == origin/master
SHA: 1117a1242ea8ad3c36f0fb76aef2c6fc580afc2e
working tree: clean
```

Current quality gates:

```text
Jest: 210 suites passed, 1348 tests passed, 1 skipped
TypeScript: PASS
ESLint: PASS
Build: PASS
Production audit: PASS
Diff check: PASS
```

Current Graphify refresh:

```text
3170 nodes
8191 edges
206 communities
```

Persistent Graphify warning:

```text
extensions.json and docs.json produce zero nodes
```

This warning is analysis-tool input behavior, not evidence of a production architecture defect. It must remain visible until the tool or input handling changes.

Current RepoWise observations:

- the previous `Execution` cycle was reduced and the current report no longer proposes a break-cycle plan for it;
- current target findings are mainly churn/co-change signals and duplicated-line suggestions;
- current high-value candidates include the remaining application boundary audit, `Execution` responsibility review, and selected adapter contracts;
- RepoWise dead-code analysis is partial because of its offset-naive/offset-aware datetime issue; zero dead-code counts are not conclusive;
- `cli.ts` is now a small bootstrap and is not a valid extraction target;
- `local_action.ts` already delegates to builders and composition; its churn signal is not enough evidence for another split;
- issue-comment and pull-request-review-comment use cases are thin lifecycle-specific wrappers around the shared `runCommentAutomation` flow and must not be merged into a universal use case without a semantic reason.

## 3. Reclassified historical objectives

The following objectives from older plans are complete or no longer valid targets in the current checkout:

| Historical objective | Current decision |
|---|---|
| Partition `ai_repository.ts` | Historical work completed; `ai_repository.ts` is not present in the current production tree. Do not recreate or search for it as an active task. |
| Dismantle `RepositoryFactory` | Historical composition migration completed to the extent supported by current callers. Verify current callers, but do not perform another generic factory rewrite. |
| Split `cli.ts` | Complete. It is a bootstrap delegating to `createCliProgram()`. Keep it small. |
| Split `local_action.ts` by line count | Rejected. Existing builders and lifecycle boundaries are already explicit. Add contract coverage only if a real wiring gap exists. |
| Extract every RepoWise helper suggestion | Rejected. Only extract a helper when its semantics, ownership, and failure behavior are shared. |
| Eliminate all repositories named `Repository` | Rejected. Specialized adapters may legitimately retain that name. |
| Remove every facade | Rejected. Remove only obsolete compatibility facades with audited callers; retain legitimate capability composition boundaries. |

These decisions prevent stale hotspot reports from driving cosmetic changes.

## 4. Target architecture

The target dependency direction is:

```text
runtime entrypoint
  -> lifecycle composition root
    -> application use case/workflow
      -> semantic application port
        -> specialized capability adapter
          -> provider client contract
            -> GitHub / AI / Git / filesystem / process / SDK detail
```

### 4.1 Domain and model boundary

Domain models and pure policies must not depend on:

- application use cases;
- infrastructure or entrypoints;
- `@actions/*`;
- Octokit, GitHub context, OpenCode, or provider DTOs;
- filesystem, process, environment, or concrete logging.

Runtime events and provider payloads must enter models through explicit input records or semantic construction contracts.

`data/model` is a transitional physical location. A future move to `domain/` is justified only when it clarifies ownership and can be performed without a mass rename or compatibility layer.

### 4.2 Application boundary

Application owns:

- use cases and workflows;
- semantic ports;
- application request/response contracts;
- pure application policies;
- orchestration of domain behavior.

Application may import only approved domain/model types, application ports, contracts, and policies.

Application must not import:

```text
data/repository
manager concrete adapters
infrastructure
@actions/*
@octokit/*
fetch
child_process
filesystem/process APIs
provider-specific agent DTOs
concrete repositories
concrete factories
composition roots
```

Type-only imports are allowed only when they do not conceal semantic coupling. A type-only import from an outer implementation must still be reviewed; it is not automatically a valid boundary.

### 4.3 Infrastructure boundary

Infrastructure owns:

- GitHub REST/GraphQL adapters and mappers;
- pagination and provider error classification;
- AI/OpenCode/CLI transport adapters;
- Git and filesystem adapters;
- process execution;
- concrete logging and runtime integration.

Infrastructure may implement application ports. It must not move business decisions into transport adapters or import entrypoint lifecycle behavior.

### 4.4 Composition and entrypoints

Composition roots are the only normal production locations that construct concrete adapters and assemble use-case graphs.

The repository preserves separate lifecycles for:

- GitHub Action execution;
- local action/CLI execution;
- CLI command registration and parsing.

A composition root may share a transport instance when the capability contract requires it, but must not become a universal registry or facade.

## 5. Non-negotiable design rules

1. Ports express semantic capabilities, never SDK or HTTP method shapes.
2. Use cases receive required ports through constructors.
3. Application never constructs a concrete adapter.
4. Provider details stay in infrastructure.
5. A port is introduced only for a real caller-facing boundary.
6. No `UniversalRepository`, `BaseRepository`, universal GitHub client, universal AI client, or generic callback repository.
7. No `Pick<UniversalPort>` used to disguise a broad dependency.
8. No compatibility shim, alias, or delegating facade created only to preserve an obsolete import.
9. Shared code requires identical semantics, inputs, outputs, failure behavior, and ownership.
10. Behavior is preserved unless an intentional correction has a regression test.
11. Every production facade removal requires caller inventory, migration, zero-reference search, and boundary-test updates.
12. RepoWise is a prioritization signal and a validation signal, never the architecture specification.
13. A metric improvement cannot justify weaker naming, hidden construction, broader ports, or reduced testability.
14. Generated Graphify, RepoWise, editor, MCP, and build artifacts remain uncommitted unless explicitly required by the repository.
15. Every coherent implementation block ends with focused tests, global gates, commit, push, SHA verification, and a clean tree.

## 6. Implementation phases

Implementation is paused until this plan is accepted. Once approved, phases are executed in small published blocks. Each phase may produce multiple commits.

### Phase A — Current-checkout boundary audit

**Goal:** Establish the real remaining architectural defects before changing production code.

Tasks:

1. Search production `application` imports for concrete `manager`, repository, infrastructure, provider, process, filesystem, and SDK dependencies.
2. Search use cases for concrete construction, global state, and runtime APIs.
3. Classify every finding as:
   - real boundary violation;
   - legitimate type-only model dependency;
   - composition-root responsibility;
   - specialized adapter;
   - test-only compatibility reference;
   - stale/historical evidence.
4. Strengthen architecture tests so forbidden production imports fail deterministically.
5. Refresh RepoWise and Graphify only after the checkout is clean.

Exit criteria:

- a reviewed inventory of every finding;
- no unclassified application boundary violation;
- architecture tests cover the rules that matter;
- baseline artifacts and warnings recorded.

### Phase B — Configuration capability boundary

**Priority:** highest confirmed defect.

Current defect:

```text
StoreConfigurationUseCase
  -> concrete manager/description/ConfigurationHandler
```

Target:

```text
StoreConfigurationUseCase
  -> semantic configuration port
    -> ConfigurationHandler adapter
```

Tasks:

1. Inspect `StoreConfigurationUseCase` callers and its exact read/write behavior.
2. Define the smallest semantic port required by the use case. Prefer separate read/write contracts if that reflects real caller capabilities.
3. Keep configuration model contracts stable and provider-independent.
4. Migrate `ConfigurationHandler` behind the port at each composition root.
5. Remove the concrete application import and all equivalent hidden construction.
6. Add use-case tests with port doubles and adapter contract tests for parsing, malformed content, preservation, and update behavior.
7. Add an architecture assertion for this boundary.

Exit criteria:

```text
0 production application imports of ConfigurationHandler
0 concrete manager adapter construction in application
use-case contract tests pass
adapter behavior tests pass
- composition wiring test passes

Current result: complete. `StoreConfigurationUseCase` depends on
`ConfigurationStorePort`; `ConfigurationHandler` is constructed only at the
GitHub Action composition boundary; application architecture tests reject
manager imports and `ConfigurationHandler` references.
```

### Phase C — `Execution` responsibility hardening

**Goal:** preserve `Execution` as a legitimate state/orchestration model while removing accidental coupling.

Tasks:

1. Inventory all `Execution` methods, state mutations, callers, and tests.
2. Keep state ownership and lifecycle orchestration together when they share one reason to change.
3. Review release/hotfix version resolution as a candidate semantic boundary.
4. Review issue-number resolution, label loading, previous-state restoration, and configuration loading independently.
5. Extract only contracts with independent callers and failure semantics.
6. Add transition tests for issue, pull request, push, single action, initial setup, release, hotfix, and restoration paths.
7. Do not split `Execution` by line count or RepoWise extract-method suggestions alone.

Exit criteria:

- no runtime dependency from the model to manager or provider details;
- all extracted behavior has a semantic name and direct tests;
- `Execution` remains understandable as the lifecycle state model;
- no universal execution context facade is introduced;
- cycle analysis remains clean or every remaining cycle is explicitly justified.

Current result: audit complete with no implementation required in this
increment. Issue-number resolution, branch-version resolution, previous-state
restoration, and setup ports are already extracted. The remaining RepoWise
extract-method suggestion in `Execution` is a comment plus state assignments,
not an independent responsibility, and is therefore intentionally rejected as
cosmetic.

### Phase D — Configuration and lifecycle composition review

**Goal:** verify that all runtime composition is explicit and lifecycle-specific.

Tasks:

1. Audit GitHub Action composition.
2. Audit local action composition.
3. Audit CLI command composition.
4. Confirm `cli.ts` remains a bootstrap only.
5. Confirm `local_action.ts` remains a lifecycle coordinator, not a dependency factory.
6. Add contract tests for capability sharing and intentional independent clients.
7. Ensure entrypoints do not construct provider repositories inline except at documented composition boundaries.

Exit criteria:

- each lifecycle has a named composition root;
- no application dependency leaks into entrypoint-only concerns;
- no lifecycle is silently merged with another;
- composition tests prove the returned capabilities and sharing relationships.

### Phase E — Adapter contract hardening

**Goal:** improve correctness and RepoWise health through behavior contracts, not generic wrappers.

Priority order:

1. issue lifecycle adapter;
2. project board link adapter;
3. authenticated user and organization membership adapters;
4. release/tag adapters;
5. pull-request lifecycle/review/changes adapters;
6. pagination and GitHub error boundaries where missing.

Current increment: `PullRequestChangesRepository` now owns one semantic
`listAllFiles` pagination operation shared by its file capabilities. The
The first-diff-line capability now paginates all changed files instead of reading
only the first page. A regression test covers multiple pages and diff-line
resolution.

The `ProjectBoardLinkRepository` now treats a mutation response without a
created item id as an unsuccessful link instead of reporting a false success.
Tests cover successful mutation responses, incomplete responses, and the
idempotent already-linked path.

The organization-members client contract is now explicitly paginable. Team
lists and every team-member list are consumed through bounded pages, while
`project_members_policy` remains provider-independent. Tests cover pagination,
deduplication across teams/pages, and selection excluding current members.

The authenticated-user adapter was audited without finding a broken production
contract. `getUserFromToken` and `getTokenUserDetails` remain separate semantic
capabilities over the same GitHub endpoint: execution identity versus commit
identity details. Contract tests now cover login resolution, trimming, optional
field fallbacks, noreply email generation, and provider error propagation.

For each adapter:

1. identify its semantic port;
2. document provider mapping;
3. test success, not-found, malformed, pagination, and unexpected-error behavior;
4. verify no provider DTO leaks through the application port;
5. preserve intentional error translation.

Exit criteria:

- each high-risk adapter has a focused contract suite;
- pagination and error behavior are explicit;
- no generic repository abstraction is introduced;
- adapter responsibilities are stable and independently testable.

### Phase F — Application boundary and dependency-graph hardening

Tasks:

1. Make architecture tests executable for every forbidden import category.
2. Detect concrete construction inside application.
3. Detect provider-shaped ports in application.
4. Detect universal capability modules and accidental re-exports.
5. Detect imports from entrypoints/composition into application.
6. Verify type-only imports do not conceal outer-layer semantic coupling.
7. Re-run Graphify and inspect cycles, hubs, and cross-layer edges.

Exit criteria:

- boundary tests fail on representative violations;
- current production graph has no unjustified application-to-detail edge;
- all remaining hubs have a documented ownership reason.

### Phase G — Documentation synchronization

Documents that must agree with the implementation:

- `docs/repository-architecture.md`;
- `docs/dependency-rules.md`;
- `docs/capability-map.md`;
- `docs/migration-baseline.md`;
- this plan;
- relevant `_agent/docs` architecture material.

Documentation must describe current paths and names. Historical completed work belongs in migration notes, not in current target lists.

Required content:

- layer rules;
- capability inventory;
- port-to-adapter mapping;
- composition roots by lifecycle;
- intentional shared infrastructure;
- forbidden abstractions;
- test and graph commands;
- known tool limitations;
- definition of done.

Exit criteria:

- no document claims a removed file is an active hotspot;
- every capability has an owner and composition location;
- a new contributor can follow the dependency direction without tribal knowledge.

### Phase H — Final perfection gates

Run only after all implementation phases are complete:

```text
pnpm exec jest --runInBand
pnpm exec tsc --noEmit
pnpm run lint
pnpm run build
pnpm audit --prod
git diff --check
```

Also run:

```text
pnpm test:coverage
~/.local/bin/repowise update .
~/.local/bin/repowise health . --no-workspace --refactoring-targets --format table
/tmp/copilot-graphify-venv/bin/graphify update .
```

Final publication requirements:

1. restore/remove generated build, Graphify, RepoWise, editor, and MCP artifacts;
2. verify no secrets or runtime state were generated;
3. commit one coherent final block;
4. push to `origin/master`;
5. verify `HEAD == origin/master`;
6. verify a clean working tree;
7. record current metrics and all warnings honestly.

## 7. RepoWise and Graphify quality target

The target is “perfect or nearly perfect” topology, defined by these properties:

- no unjustified dependency cycles;
- no universal hubs representing multiple unrelated capabilities;
- low application-to-infrastructure leakage;
- low facade coupling after caller migration;
- low churn concentration in modules with multiple unrelated responsibilities;
- no high-risk adapter without contract tests;
- duplication only where semantic differences justify it;
- composition roots recognized as legitimate boundaries rather than extracted away;
- dead-code conclusions reported only when RepoWise analysis is complete.

We will compare:

- RepoWise average health;
- hotspot health;
- worst performer;
- risk and maintainability;
- cycle count and edge count;
- Graphify hubs and cross-layer edges;
- test coverage and boundary-test count.

We will not use these as goals by themselves:

- NLOC reduction;
- number of files;
- zero duplication;
- zero repositories;
- zero composition roots;
- artificial score improvement from wrappers or aliases.

A RepoWise finding is considered resolved only when one of these is true:

1. the responsibility was correctly partitioned and callers migrated;
2. the dependency was removed through a semantic boundary;
3. the finding was verified as a legitimate composition/adapter boundary and documented;
4. the metric was proven stale or tool-generated and excluded with evidence.

## 8. Per-block execution protocol

Before editing:

1. refresh current checkout evidence;
2. inspect complete target files and all production callers;
3. classify responsibilities and dependencies;
4. state the intended boundary and why it is semantic;
5. identify focused tests and architecture tests.

During editing:

1. make one coherent capability change;
2. use `pnpm` only;
3. avoid compatibility shims and broad mechanical replacements;
4. preserve behavior and error contracts;
5. add tests before or with the migration.

Before publication:

1. run focused tests;
2. run TypeScript and lint;
3. run the full suite;
4. run diff check;
5. refresh RepoWise/Graphify;
6. restore generated artifacts;
7. commit and push;
8. verify remote SHA and clean tree.

## 9. Definition of done

The reconstruction is complete when:

- all confirmed application boundary violations are removed;
- all runtime composition is explicit;
- all relevant capabilities have semantic ports;
- provider details are isolated in specialized adapters;
- no unjustified cycles remain;
- no obsolete facade has active callers;
- legitimate facades and composition roots are documented;
- architecture tests enforce the rules;
- adapter and use-case contracts are covered;
- documentation matches the current checkout;
- RepoWise is healthy or every remaining finding has a documented architectural justification;
- Graphify contains no unexplained cross-layer or cycle defect;
- coverage, tests, typecheck, lint, build, audit, and diff checks pass;
- the published SHA and clean tree are verified.

Until these criteria are met, the project is not declared architecturally complete.

## 10. Current next action after plan approval

Do not begin with `local_action.ts`, `cli.ts`, generic helper extraction, or historical `ai_repository`/`RepositoryFactory` work.

The first implementation block after approval is:

> **Migrate `StoreConfigurationUseCase` behind a semantic configuration port, update its composition roots and tests, then enforce the boundary with an architecture test.**
