# Total Architecture Reconstruction Plan

## Intent

This plan reconstructs Copilot's architecture around semantic capabilities and explicit runtime composition. It is not a superficial RepoWise-score exercise: RepoWise metrics are an explicit optimization signal, but they must improve as a consequence of better cohesion, dependency direction, testability, and deletion of accidental complexity. No metric will justify a fake abstraction or a semantic regression.

The plan permits large changes, file moves, and deletion of legacy abstractions. It forbids compatibility shims, universal repositories, universal provider clients, and mechanical helper extraction without shared semantics.

## Current evidence

The baseline below was refreshed against the published HEAD `4178531005881680741a694f1788253734abb831` before production changes begin. The working tree was clean and `HEAD == origin/master`.

The current repository has useful capability ports, specialized GitHub adapters, input-source policies, and architecture tests, but it is still an intermediate migration state.

Graphify AST-only baseline:

- 471 code files;
- 2,327 nodes;
- 6,764 edges.

RepoWise refreshed baseline:

- 564 analyzed files;
- average health: 8.46;
- hotspot health: 5.95;
- maintainability average: 9.19;
- maintainability hotspot: 8.53;
- performance average: 9.99;
- worst performer: `src/data/repository/ai_repository.ts`;
- worst performer score: 3.43;
- current RepoWise graph: 2,672 nodes and 5,436 edges;
- safe dead-code result: 0 unreachable files and 0 unused exports;
- index-only refresh: successful.

Important Graphify hubs:

- `Execution`: degree 221;
- `GithubClientPort`: degree 71;
- `IssueRepository`: degree 49;
- `RepositoryFactory`: degree 35.

Important subgraphs:

- `AiRepository`: 47 connections;
- `RepositoryFactory`: 85 connections;
- `cli.ts`: 36 connections.

RepoWise is used to identify risk and history hotspots, not to dictate abstractions. In particular, duplicated tests, prompts, and similar HTTP calls must not be abstracted unless their semantics and failure behavior are actually shared.

## Target topology

```text
entrypoint
  -> runtime composition root
    -> application use case / workflow
      -> semantic application port
        -> capability adapter
          -> provider client port
            -> GitHub / AI / Git / filesystem / process
```

Target source organization:

```text
src/
  domain/
    models/
    value_objects/
    policies/

  application/
    ports/
      ai/
      github/
      git/
      issue/
      pull_request/
      branch/
      project/
      organization/
      release/
    contracts/
    policies/
    services/
    usecases/
    workflows/

  infrastructure/
    github/
      clients/
      adapters/
      mappers/
      errors/
      pagination/
    agents/
      opencode/
      cli/
    git/
    filesystem/
    process/

  composition/
    github_action_composition.ts
    cli_composition.ts
    local_composition.ts
    agent_composition.ts
    github/

  entrypoints/
    github_action.ts
    local_action.ts
    cli/
      commands/
      input_mappers/
      output/
```

Moves into this topology are semantic migrations, not file renames. The current `data/model` and `data/repository` locations are transitional and must not be treated as the final architectural boundary.

## Non-negotiable dependency rules

1. Domain imports nothing from application, infrastructure, entrypoints, providers, or runtime SDKs.
2. Application imports domain and application contracts/ports only.
3. Application never imports `data/repository`, infrastructure, `@actions/*`, Octokit, `fetch`, `child_process`, or provider-specific models.
4. Semantic application ports contain business capabilities, not HTTP or SDK method shapes.
5. Provider client ports are infrastructure contracts and never leak into use cases.
6. Adapters own provider mapping, pagination, authentication transport, and error translation.
7. Composition roots are the only production locations that construct concrete adapters.
8. Each runtime has its own composition root: GitHub Action, CLI, and local execution.
9. A legacy facade is removed when all production callers and tests use its semantic ports.
10. Shared code is justified by identical semantics, inputs, outputs, and failure behavior—not by similar syntax.

## Phase 0 — baseline and architecture contract

Before structural migration, fix and lock any confirmed behavior defects found by the audit. In particular, `src/data/model/single_action.ts` currently evaluates `isSingleActionWithoutIssue` before assigning `currentSingleAction`; add regression tests for `think_action` and `initial_setup`, correct the initialization order, and verify the complete suite before moving the model.

- Reindex Graphify against the current HEAD with `--code-only`.
- Capture RepoWise health, hotspots, security, coverage, tests, typecheck, lint, build, and workflow validation.
- Update architecture documentation so it describes the actual graph, not an earlier migration state.
- Add executable boundary tests for application-to-data-repository imports and provider leakage.
- Publish `docs/capability-map.md`, `docs/dependency-rules.md`, and `docs/migration-baseline.md`.

Exit criteria:

- baseline is reproducible;
- generated graph/index artifacts are ignored;
- all current behavior gates pass;
- architecture rules are executable.

## Phase 1 — domain stabilization

Move domain models and value objects out of `data/model` according to semantic ownership. Candidates include `Issue`, `PullRequest`, `Branches`, `Commit`, `Execution`, `Ai`, `Agent`, `Result`, labels, images, projects, and issue types.

Remove all domain reads of:

- `github.context`;
- `process.env`;
- `@actions/*`;
- Octokit;
- OpenCode;
- filesystem or process APIs.

Transform runtime events into explicit input records in entrypoints before domain construction.

Exit criteria:

- domain tests run without GitHub or provider modules;
- domain has no outer-layer imports;
- all runtime data enters through explicit records.

## Phase 2 — AI capability reconstruction

`AiRepository` is a facade, transport dispatcher, configuration validator, prompt builder, response interpreter, retry coordinator, logger, and error policy in one class. It must not remain the central AI abstraction.

### Application contracts

Move semantic contracts from `src/data/repository/agent_ports.ts` to application:

```text
FindingsAgentPort
FixerAgentPort
AgentServerLifecyclePort
```

Replace provider-shaped methods such as `askAgent(Ai, agentId, prompt, options)` and `copilotMessage(Ai, prompt)` with semantic requests and responses that do not expose `Ai`, OpenCode agent IDs, `parts`, or provider schemas.

### Application policies

Move and classify:

```text
agent_configuration_policy
agent_prompt_policy
agent_response_policy
agent_json_policy
agent_retry_policy
agent_task_policy
```

Keep configuration builders in the presentation/composition boundary. Keep OpenCode `parts` interpretation in the OpenCode adapter; keep stable findings/fixer interpretation in application contracts/policies.

### Infrastructure adapters

Partition:

```text
OpenCodeHttpAdapter
OpenCodeInvoker
OpenCodeServerLifecycleAdapter
AgentCliProcessAdapter
CodexCliAdapter
CursorCliAdapter
```

`child_process` must be known only by the process adapter. HTTP and OpenCode protocol details must stay under `infrastructure/agents/opencode`.

### Composition

Replace `DefaultAgentRepositoryFactory` with `agent_composition.ts` returning distinct capabilities:

```ts
{
  findings: FindingsAgentPort;
  fixer: FixerAgentPort;
  lifecycle: AgentServerLifecyclePort;
}
```

The same internal transport can be shared, but findings and fixer must be different capability objects and contracts.

### Migration order

1. Add application contracts and boundary tests.
2. Migrate all findings callers to application ports.
3. Migrate all fixer callers to application ports.
4. Replace use-case mocks of `AiRepository` with port fakes.
5. Move pure policies.
6. Build infrastructure adapters and contract tests.
7. Inject one agent composition into `common_action`, CLI, and GitHub composition.
8. Remove repeated `new DefaultAgentRepositoryFactory()` calls.
9. Delete `AiRepository` and `DefaultAgentRepositoryFactory` after zero production/test imports remain.

AI deletion criteria:

```text
0 AiRepository production imports
0 DefaultAgentRepositoryFactory production imports
0 data/repository/agent_ports imports from application
0 provider-shaped AI request in application
0 universal AI client
```

## Phase 3 — provider and GitHub infrastructure

Split `octokit_client.ts` into capability adapters and split the generic `GithubClientPort` definitions by provider capability. The infrastructure layer may share transport mechanisms, but application contracts must remain semantic.

Target adapters include issue content/metadata/labels/lifecycle/assignment, pull-request changes/review/lifecycle, branch comparison/merge/workflow, projects, releases, organization, and GraphQL.

Every adapter receives:

- focused mapping tests;
- provider error tests;
- pagination tests where applicable;
- composition tests;
- no business policy.

## Phase 4 — legacy facade retirement

Migrate callers and delete facades in this order:

1. `IssueRepository` → issue capability ports;
2. `PullRequestRepository` → changes/review/lifecycle/link ports;
3. `BranchRepository` → query/comparison/merge/workflow/tag ports;
4. `OrganizationRepository` → identity/membership/authorization ports;
5. project board legacy facades → project query/content/field/command ports;
6. release facade → repository metadata/tag/release ports.

No facade is retained merely as an alias. A remaining composer must have a documented aggregate responsibility and no new consumers.

## Phase 5 — composition roots and entrypoints

Create independent runtime composition:

```text
GitHub Action:
  event mapping -> GitHub composition -> application workflow

CLI:
  argument parsing -> CLI composition -> command handler -> application

Local action:
  parameter precedence -> local composition -> application workflow
```

`cli.ts` becomes a thin entrypoint. Commands move to individual handlers with input mappers and output policies. The CLI must not import repositories, `AiRepository`, provider adapters, or `RepositoryFactory`.

`common_action.ts` may share application orchestration and input policies, but not runtime-specific lifecycle or provider construction.

## Phase 6 — workflow and hub decomposition

Audit `Execution` (Graphify degree 221) as a possible workflow coordinator/domain aggregate collision. Separate only proven responsibilities:

```text
ExecutionContext
ActionWorkflow
BranchWorkflow
IssueWorkflow
PullRequestWorkflow
AgentWorkflow
```

Audit shared hubs such as `Logger`, `Result`, and `ParamUseCase` before splitting. Convert logging to an application `LoggerPort` if application needs it; keep concrete logging in infrastructure.

## Phase 7 — tests and architecture enforcement

Add tests for:

- domain boundaries;
- application boundaries;
- entrypoint boundaries;
- composition roots;
- facade retirement;
- provider adapter contracts;
- AI response/error/retry/cancellation behavior.

Replace concrete `AiRepository` mocks in use-case tests with port fakes. Keep provider-specific tests at the infrastructure boundary.

## Phase 8 — documentation and tooling

Maintain:

```text
docs/architecture-target.md
docs/capability-map.md
docs/composition-roots.md
docs/ai-architecture.md
docs/github-adapters.md
docs/cli-architecture.md
docs/testing-architecture.md
docs/graphify-development.md
docs/repowise-development.md
```

After every slice:

```text
Graphify → callers, paths, impact, hubs
RepoWise  → risk, churn, complexity, duplication
Tests     → behavior
Git       → published change
```

## Phase 9 — final gates

The migration is complete only when:

- no application use case constructs a concrete adapter;
- no domain model imports a provider or runtime SDK;
- no universal AI or GitHub client remains;
- obsolete facades have zero production callers or a documented aggregate role;
- each runtime has an explicit composition root;
- application ports describe semantic capabilities;
- all critical adapters have focused tests;
- Graphify confirms the expected topology;
- RepoWise hotspots are either eliminated or explained by an intentional composition boundary;
- tests, coverage, typecheck, lint, build, audit, workflows, security, diff check, clean tree, and remote SHA all pass.

The quality target is architectural coherence and verifiable dependency direction. RepoWise score improvement is an outcome, never the design objective.
