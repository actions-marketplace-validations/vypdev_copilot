# Current Capability Map

This document describes the current checkout, not the original reconstruction baseline. It is synchronized with `docs/total-architecture-reconstruction-plan.md` and must be updated whenever a capability boundary changes.

## Architectural shape

```text
entrypoint
  -> lifecycle composition root
    -> application use case/workflow
      -> semantic port
        -> specialized adapter
          -> provider client/detail
```

Composition roots are capability-specific under `src/infrastructure/composition/` and lifecycle-specific under the action/CLI entrypoints. A universal repository factory is not the application boundary.

## AI capabilities

The historical AI facade reconstruction is complete for the current checkout. AI behavior is represented through separate findings, fixer, authentication, configuration, response, and lifecycle contracts. Do not add a new universal AI repository or recreate `ai_repository.ts`.

| Capability | Application contract | Infrastructure/detail | Main consumers |
|---|---|---|---|
| Findings analysis | `FindingsQueryPort` / findings capability contracts | OpenCode server/CLI adapters and response policies | progress, recommendations, think, language checks, Bugbot findings |
| Fixer execution | fixer capability contracts | OpenCode/CLI execution and fixer response policy | user request, Bugbot autofix, CLI `do` |
| Agent configuration | agent configuration contracts/policies | runtime configuration builders | action and CLI composition |
| Agent lifecycle | lifecycle port | OpenCode server lifecycle adapter | runtime composition |

## Configuration capability

| Capability | Application boundary | Adapter | Status |
|---|---|---|---|
| Read/write persisted issue configuration | `ExecutionConfigurationPort` and the future configuration store contract | `ConfigurationHandler` | `Execution` migration completed; `StoreConfigurationUseCase` boundary remains the next implementation block |

`ConfigurationHandler` must never be imported as a concrete implementation from an application use case.

## Issue capabilities

| Capability | Semantic port | Specialized adapter family | Status |
|---|---|---|---|
| Content and comments | `IssueContentPort` / lifecycle content contracts | issue content adapters | active |
| Metadata and issue/PR identity | metadata contracts | issue metadata adapters | active |
| Lifecycle | `IssueLifecyclePort` | issue lifecycle adapter | active; contract hardening remains |
| Labels | issue label contracts | issue label adapter | active |
| Progress labels | progress label contracts/policies | progress label adapter | active |
| Assignment | assignment contracts | assignment adapter | active |
| Issue types | issue type contracts | issue type adapter | active |
| Configuration persistence | configuration port | `ConfigurationHandler` | boundary migration pending for `StoreConfigurationUseCase` |

Legacy aggregate facades may remain only where a real caller still requires an aggregate capability. New application code must use the narrowest existing semantic contract.

## Pull request capabilities

| Capability | Semantic port | Specialized adapter family | Status |
|---|---|---|---|
| Changed files and head metadata | pull request changes contract | changes adapter | active |
| Reviews, reviewers, comments | `PullRequestReviewPort` | review adapter | active |
| Review threads | review-thread contract | GraphQL thread adapter | active |
| Lifecycle, base branch, linked state | `PullRequestLifecyclePort` | lifecycle adapter | active |

Changes, review, and lifecycle must remain separate unless a caller proves a cohesive aggregate contract.

## Branch and release capabilities

| Capability | Semantic port | Adapter/policy | Status |
|---|---|---|---|
| Latest tag | `LatestTagQueryPort` | release/tag adapter | active |
| Branch comparison | branch comparison port | comparison adapter | active |
| Merge and status | branch merge port | merge adapter and status client | active |
| Workflow runs | workflow port | workflow adapter | active |
| Branch naming/preparation/lifecycle | branch capability ports | specialized branch adapters/policies | active |
| Release/tag publication | release/tag ports | release adapters and pure policies | active |

## Project board capabilities

| Capability | Port | Composition/adapter | Status |
|---|---|---|---|
| Query project details | `ProjectBoardQueryPort` | project board composition root | active |
| Resolve/link content | project content/link contracts | project board adapters | active |
| Update fields/columns | `ProjectBoardCommandPort` | project board composition root | active |

The query capability is intentionally shared by link and command capabilities where the composition contract requires it. This sharing is covered by a composition test.

## Organization and identity capabilities

| Capability | Port | Adapter | Status |
|---|---|---|---|
| Authenticated identity | `AuthenticatedUserPort` | identity adapter | active; contract hardening remains |
| Organization members | `OrganizationMembersPort` | organization adapter | active |
| Actor authorization | `ActorAuthorizationPort` | actor authorization adapter | contract covered |

These capabilities may share provider transport but must not be collapsed into one application port.

## Runtime composition roots

| Runtime | Main boundary | Responsibility |
|---|---|---|
| GitHub Action | `github_action.ts`, `common_action.ts`, capability roots | event mapping, setup, lifecycle, routing, publication |
| Local action | `local_action.ts` and local builders | local input precedence, execution, result rendering |
| CLI | `cli.ts`, `cli/cli_program.ts`, command modules | registration, parsing, command-specific composition |
| Capability composition | `src/infrastructure/composition/` | concrete adapter construction and dependency graph assembly |

`cli.ts` is intentionally a small bootstrap. `local_action.ts` already delegates to dedicated configuration and execution builders. Neither is an automatic extraction target.

## Current high-priority boundaries

1. `StoreConfigurationUseCase` must stop importing concrete `ConfigurationHandler`.
2. Application boundary tests must cover all concrete manager/repository/infrastructure imports.
3. `Execution` must be audited by responsibility, not by line count.
4. High-risk issue, project-board, identity, release, and pull-request adapters need contract coverage where gaps remain.
5. Documentation and graph reports must reflect the current checkout.

## Explicit non-goals

- Recreating `ai_repository.ts` or a universal AI facade.
- Recreating `RepositoryFactory` as a universal composition boundary.
- Splitting `cli.ts` or `local_action.ts` merely because of churn scores.
- Creating `BaseRepository`, `UniversalRepository`, or generic provider wrappers.
- Extracting every duplicated block reported by RepoWise.
- Deleting specialized adapters because their names contain `Repository`.
- Optimizing NLOC, file count, or duplication without semantic evidence.

## Caller migration and retirement protocol

A facade or builder may be retired only after:

1. all production callers are enumerated;
2. callers are classified by capability and lifecycle;
3. a semantic port or direct composition boundary exists;
4. focused behavior and composition tests pass;
5. a zero-reference search confirms migration;
6. architecture tests are updated;
7. full gates and graph refresh pass;
8. the removal is published and the remote SHA is verified.
