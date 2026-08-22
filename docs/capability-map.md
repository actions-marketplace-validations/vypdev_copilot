# Current Capability Map

This map describes the current `master` checkout. Use `git rev-parse HEAD` for
the published checkpoint; the document does not encode the SHA of the commit
that contains itself. Historical facades and migration steps are documented
separately and must not be treated as current production architecture. Current
quality priorities and metric acceptance criteria are defined in
[`repowise-perfect-metrics-plan.md`](./repowise-perfect-metrics-plan.md).

## Architectural shape

```text
entrypoint
  -> lifecycle/capability composition
    -> application use case/workflow
      -> semantic port
        -> specialized adapter
          -> provider client/detail
```

## Capability inventory

### AI and agent

| Capability                         | Application boundary         | Composition/detail                             | Status |
| ---------------------------------- | ---------------------------- | ---------------------------------------------- | ------ |
| Findings execution                 | findings ports               | agent capability root + OpenCode adapters      | active |
| Fixer execution                    | fixer ports                  | agent capability root + OpenCode adapters      | active |
| Agent configuration                | configuration ports/policies | runtime configuration builders                 | active |
| Server lifecycle                   | server lifecycle port        | OpenCode lifecycle adapter                     | active |
| Bugbot issue/PR context and writes | Bugbot read/write ports      | Bugbot composition root + specialized adapters | active |

Findings and fixer contracts remain separate. Do not recreate
`ai_repository.ts` or a universal agent facade.

### Configuration and execution setup

| Capability                          | Semantic contract                 | Adapter/composition                                             | Status                       |
| ----------------------------------- | --------------------------------- | --------------------------------------------------------------- | ---------------------------- |
| Read persisted configuration        | `ExecutionConfigurationPort`      | `ConfigurationHandler` in `execution_setup_composition_root.ts` | complete and boundary-tested |
| Store persisted configuration       | `ConfigurationStorePort`          | `ConfigurationHandler` at GitHub Action completion boundary     | complete and boundary-tested |
| Resolve/setup execution issue       | execution resolution/setup ports  | `SetupExecutionUseCase` + execution issue setup root            | complete and characterized   |
| Resolve release/hotfix branch state | injected release/hotfix use cases | `ExecutionBranchVersionResolver` in execution setup root        | complete and acyclic         |

The read/setup and version-resolution rows are now acyclic.
`SetupExecutionUseCase` and `ExecutionBranchVersionResolver` own orchestration;
`ExecutionConfigurationPort` accepts a semantic query; and the old model-owned
resolvers were removed without a compatibility facade. A productive Tarjan
guard rejects future static or dynamic import cycles.

### Issues

| Capability family    | Semantic boundary                     | Specialized adapter/composition | Status                                    |
| -------------------- | ------------------------------------- | ------------------------------- | ----------------------------------------- |
| Content/comments     | issue content contracts               | issue content adapter/root      | active                                    |
| Metadata/identity    | issue identity and metadata contracts | issue metadata adapter/root     | active                                    |
| Lifecycle            | `IssueLifecyclePort`                  | issue lifecycle adapter         | active; audit only with contract evidence |
| Titles               | issue title contract                  | issue title adapter             | active                                    |
| Labels/progress      | issue management/label contracts      | label adapters/roots            | active                                    |
| Assignment/types     | issue management contracts            | assignment/type adapters        | active                                    |
| Notification/closure | lifecycle interaction contracts       | issue interaction root          | active                                    |
| Bugbot issue access  | Bugbot issue ports                    | Bugbot issue adapter/root       | active                                    |

No current production `IssueRepository` aggregate facade exists.

### Pull requests

| Capability family                       | Semantic boundary                     | Adapter/composition                         | Status                                           |
| --------------------------------------- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Changed files/head metadata             | GitHub pull-request changes contracts | `PullRequestChangesRepository`              | paginated and regression-covered                 |
| Reviewer membership/requests            | `PullRequestReviewerPort`             | `PullRequestReviewerRepository`             | paginated completed reviews and contract-covered |
| Review-comment query                    | `PullRequestReviewCommentQueryPort`   | `PullRequestReviewCommentQueryRepository`   | paginated and nullable contract-covered          |
| Review-comment command                  | `PullRequestReviewCommentCommandPort` | `PullRequestReviewCommentCommandRepository` | create/update subports; bounded publication      |
| Review-thread resolution                | `PullRequestReviewThreadCommandPort`  | GraphQL thread adapter                      | nullable, cursor-safe, 64-bit and idempotent     |
| Lifecycle/base branch/linked state      | pull-request lifecycle contracts      | lifecycle adapter                           | active                                           |
| Issue linking/description/branch lookup | dedicated PR ports                    | specialized adapters                        | active                                           |
| Bugbot PR access                        | Bugbot PR ports                       | Bugbot PR adapter/root                      | publication and resolution capabilities narrowed |

No current production `PullRequestRepository`, `PullRequestReviewRepository`,
or universal pull-request review port exists. Reviewer, comment query, comment
command, and thread resolution are composed independently.
Bugbot finding resolution receives only issue-comment update, review-comment
list/update, and thread-resolution capabilities through
`BugbotFindingResolutionPorts`; review-comment and issue-comment creation remain
available only to the broader finding-publication pipeline. Route composition
exposes a separate `resolution` view backed by the same specialized adapters.

### Project boards

| Capability            | Port                      | Adapter/composition             | Status                     |
| --------------------- | ------------------------- | ------------------------------- | -------------------------- |
| Query project details | `ProjectBoardQueryPort`   | `ProjectBoardQueryRepository`   | active                     |
| Resolve/link content  | `ProjectBoardLinkPort`    | `ProjectBoardLinkRepository`    | response contract hardened |
| Update fields/columns | `ProjectBoardCommandPort` | `ProjectBoardCommandRepository` | active                     |

`createProjectBoardCompositionRoot()` intentionally shares the query capability
with link and command adapters. This sharing is composition-tested.

### Organization and identity

| Capability             | Port                      | Adapter                         | Status                         |
| ---------------------- | ------------------------- | ------------------------------- | ------------------------------ |
| Organization members   | `OrganizationMembersPort` | `OrganizationMembersRepository` | paginated and contract-covered |
| Authenticated identity | `AuthenticatedUserPort`   | `AuthenticatedUserRepository`   | audited and contract-covered   |
| Actor authorization    | `ActorAuthorizationPort`  | `ActorAuthorizationRepository`  | active and covered             |

These contracts may share provider transport but must not collapse into one
application port.

### Branch, release, Git, and workflow

| Capability                      | Port family                                                  | Adapter/composition                                                          | Status                                                        |
| ------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Latest tag/tag operations       | branch tag and GitHub release ports                          | tag adapter/repository                                                       | active; correctness audit required, SCC prerequisite complete |
| Release publication             | `RepositoryReleasePublicationPort`                           | release publication repository/root                                          | active; correctness audit required, SCC prerequisite complete |
| Default branch                  | release/repository metadata contracts                        | default branch adapter                                                       | active                                                        |
| Branch comparison               | branch change ports                                          | comparison adapter                                                           | active                                                        |
| Merge/status                    | branch merge ports                                           | merge adapter                                                                | active                                                        |
| Preparation/naming/lifecycle    | branch capability ports                                      | specialized branch adapters/policies                                         | active                                                        |
| Wait for previous workflow runs | `PreviousWorkflowRunsQueryPort` + `WorkflowPollingDelayPort` | `WaitForPreviousWorkflowRunsUseCase` + specialized query/timer adapters/root | complete and contract-tested                                  |
| Dispatch workflow               | `BranchWorkflowPort`                                         | `WorkflowDispatchRepository` in issue composition                            | complete and contract-tested                                  |
| Local Git commit/push           | Git ports                                                    | `GitCommitAdapter` / `GitCliRepository`                                      | runtime-specific                                              |

Release and tag behavior remain separate policies unless identical semantics and
failure contracts are demonstrated.

## Runtime boundaries

| Runtime/boundary          | Current location                                                | Responsibility                                                |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------- |
| GitHub Action             | `src/actions/github_action.ts`                                  | event/input mapping and GitHub lifecycle                      |
| Local action              | `src/actions/local_action.ts`                                   | local configuration, execution, rendering                     |
| CLI                       | `src/cli.ts`, `src/cli/**`                                      | bootstrap, parsing, command-specific composition              |
| Main route selection      | `src/actions/common_action.ts`, `src/actions/main_run_route.ts` | lifecycle-owned route resolution and unhandled failure policy |
| Main route dispatch       | `src/actions/main_run_dispatcher.ts`                            | route logging and invocation of precomposed handlers only     |
| Capability/use-case roots | `src/infrastructure/composition/**`                             | concrete provider clients and adapter graphs                  |

The lifecycles remain independent. Phase D moved route assembly into
`main_run_route_composition_root.ts` and workflow polling into
`workflow_queue_composition_root.ts`; an architecture test keeps the dispatcher
free of concrete assembly. `cli.ts` is a legitimate bootstrap. `local_action.ts`
remains a separate lifecycle but still constructs Project Board capabilities and
`GitCliRepository` inline; this named-root gap is tracked after the P0 contract
blocks and is not justified by churn or line-count metrics.

## Current priorities

1. close Phase 4 with immutable RepoWise/Graphify evidence, publication and
   exact-SHA remote verification;
2. continue the remaining issue title/type and setup contract track;
3. continue pull-request lifecycle/changes coverage without reopening the
   completed review-capability partition;
4. continue release/tag correctness in the authoritative order;
5. keep architecture guards and documentation synchronized;
6. re-run RepoWise and Graphify after each coherent block.

## Explicit non-goals

- recreating `ai_repository.ts`, `RepositoryFactory`, or aggregate issue/PR
  facades;
- creating `BaseRepository`, `UniversalRepository`, or provider-wide wrappers;
- splitting `Execution`, `cli.ts`, or `local_action.ts` from metrics alone; the
  former SCC was removed through semantic orchestration rather than arbitrary
  file slicing;
- extracting every RepoWise duplicated block;
- moving directories through a compatibility layer merely to improve naming;
- deleting legitimate adapters or composition hubs to lower graph degree.

## Retirement protocol

Before removing or replacing a facade/builder:

1. enumerate production callers;
2. classify lifecycle and capability ownership;
3. establish a semantic contract;
4. add focused and composition tests;
5. prove zero production references;
6. update executable architecture rules;
7. pass global gates and graph analysis;
8. publish and verify the remote SHA and clean tree.
