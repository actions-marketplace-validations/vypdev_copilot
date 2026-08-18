# Capability Map and Retirement Matrix

This is the initial capability map for the reconstruction. It is intentionally explicit about current locations, intended semantic contracts, current consumers, target adapters, and deletion conditions. It must be updated after every migration slice.

## AI capabilities

| Current element | Real responsibility | Target application contract | Target infrastructure | Current consumers | Retirement condition |
|---|---|---|---|---|---|
| `AiRepository.askAgent` | findings invocation, transport selection, prompt, response interpretation, retry, logging | `FindingsAgentPort` | `FindingsAgentAdapter`, OpenCode/CLI adapters | progress, recommendations, think, issue/PR language, Bugbot | all findings callers use application port |
| `AiRepository.copilotMessage` | fixer invocation, transport selection, response mapping | `FixerAgentPort` | `FixerAgentAdapter` | user request, Bugbot autofix, CLI `do` | all fixer callers use application port |
| `OpenCodeServerLifecycleAdapter` | server start/stop/health | `AgentServerLifecyclePort` | OpenCode lifecycle adapter | GitHub Action composition | lifecycle type no longer comes from data repository |
| `agent_ports.ts` | mixed semantic and provider contracts | application ports + infrastructure provider ports | separate contract modules | application use cases and adapters | no application import from `data/repository/agent_ports` |
| `DefaultAgentRepositoryFactory` | returns two views of one `AiRepository` | no factory API | `agent_composition.ts` | CLI, `common_action`, `RepositoryFactory` | zero production/test imports |
| `AgentCliClient` | spawn, timeout, kill, output limits, cleanup | internal process port only | `AgentCliProcessAdapter` | AI adapters | process details isolated |
| `OpenCodeHttpClient` | HTTP, timeout, session/message, response transport | internal OpenCode port | `OpenCodeHttpAdapter` | AI adapters | OpenCode DTOs do not leak into application |

## Issue capabilities

| Current facade/capability | Semantic capability | Target port | Target adapter family | Retirement condition |
|---|---|---|---|---|
| `IssueRepository` content methods | content read/write/comments | `IssueContentPort` | issue content adapter | zero facade callers |
| `IssueRepository` metadata methods | issue/PR metadata and IDs | `IssueMetadataPort` | metadata/GraphQL adapters | zero facade callers |
| `IssueRepository` lifecycle methods | open/close/state | `IssueLifecyclePort` | lifecycle adapter | zero facade callers |
| label methods | labels | `IssueLabelPort` | labels adapter | zero facade callers |
| progress label methods | progress label policy | `IssueProgressLabelPort` | composed label capability | explicit callers only |
| label provisioning | repository label creation | `IssueLabelProvisioningPort` | provisioning adapter | zero facade callers |
| assignment methods | assignee queries and changes | `IssueAssignmentPort` | assignment adapter | zero facade callers |
| issue type methods | type lookup/assignment | `IssueTypePort` | GraphQL type adapter | zero facade callers |

## Pull request capabilities

| Current element | Target capability | Target port | Adapter |
|---|---|---|---|
| `PullRequestChangesRepository` | changed files and head metadata | `PullRequestChangesPort` | Octokit changes adapter |
| `PullRequestReviewRepository` | reviews, reviewers, comments | `PullRequestReviewPort` | Octokit review adapter |
| `PullRequestReviewThreadRepository` | GraphQL thread operations | `PullRequestReviewThreadPort` | GraphQL adapter |
| `PullRequestLifecycleRepository` | list/update lifecycle | `PullRequestLifecyclePort` | lifecycle adapter |
| `PullRequestRepository` | legacy aggregate facade | none unless a real aggregate remains | delete after caller migration |

## Branch capabilities

| Current element | Target capability | Target port | Adapter |
|---|---|---|---|
| `BranchRepository` queries | branch existence/list/ref | `BranchQueryPort` | branch adapter |
| `BranchCompareRepository` | commit comparison | `BranchComparisonPort` | comparison adapter |
| `MergeRepository` | merge/poll/status policy boundary | `BranchMergePort` | merge adapter + status client |
| workflow operations | dispatch and previous runs | `BranchWorkflowPort` | workflow adapter |
| tags/version lookup | latest tag | `LatestTagQueryPort` | release/tag adapter |
| `BranchRepository` facade | mixed branch aggregate | none unless proven cohesive | delete after callers migrate |

## Organization, project, and release capabilities

| Current facade | Target ports | Target outcome |
|---|---|---|
| `OrganizationRepository` | `AuthenticatedUserPort`, `OrganizationMembersPort`, `ActorAuthorizationPort` | remove facade |
| `ProjectBoardRepository` | `ProjectBoardQueryPort`, `ProjectBoardCommandPort`, `ProjectContentResolverPort`, `ProjectFieldPort` | retain only focused capabilities |
| `RepositoryReleaseRepository` | `RepositoryMetadataPort`, `RepositoryTagPort`, `RepositoryReleasePort` | remove mixed release facade |

## Composition capabilities

| Current element | Current problem | Target |
|---|---|---|
| `RepositoryFactory` | adapters, repositories, use cases, AI and repeated construction | capability composers + application container |
| `common_action.ts` | hidden composition root, routing, error presentation | application runner + thin runtime adapter |
| `github_action.ts` | input mapping, lifecycle, construction, publication in one module | GitHub input source, mapper, lifecycle, publisher |
| `local_action.ts` | duplicated input mapping and construction | local input source, mapper, lifecycle |
| `cli.ts` | parsing, Git, AI construction, execution, exits, output | registration-only bootstrap + command handlers |
| `Execution` | mutable state, setup, routing, resolution, results | request/state/setup service/policies |

## Consumers requiring migration

### AI findings consumers

```text
src/application/usecases/actions/check_progress_use_case.ts
src/application/usecases/actions/recommend_steps_use_case.ts
src/application/usecases/steps/common/think_use_case.ts
src/application/usecases/steps/issue/answer_issue_help_use_case.ts
src/application/usecases/steps/issue_comment/check_issue_comment_language_use_case.ts
src/application/usecases/steps/pull_request_review_comment/check_pull_request_comment_language_use_case.ts
src/application/usecases/steps/pull_request/update_pull_request_description_use_case.ts
src/application/usecases/steps/commit/detect_potential_problems_use_case.ts
src/application/usecases/steps/commit/bugbot/query_bugbot_findings.ts
src/application/usecases/steps/commit/bugbot/detect_bugbot_fix_intent_use_case.ts
```

### AI fixer consumers

```text
src/application/usecases/steps/commit/user_request_use_case.ts
src/application/usecases/steps/commit/bugbot/bugbot_autofix_use_case.ts
src/cli.ts  # CLI do path must be migrated
```

### Composition consumers

```text
src/actions/common_action.ts
src/cli.ts
src/infrastructure/composition/repository_factory.ts
src/actions/github_action.ts
src/actions/local_action.ts
```

## Retirement protocol

For each facade:

1. enumerate methods and callers;
2. classify every method semantically;
3. define port and request/response contract;
4. add contract tests;
5. migrate use cases;
6. migrate composition roots;
7. migrate test doubles;
8. run Graphify impact check;
9. verify zero production imports;
10. delete the facade and its tests;
11. rerun all gates;
12. document the deletion commit and rationale.

A facade may not be deleted based solely on a search that omits dynamic construction, test imports, or composition wiring.
