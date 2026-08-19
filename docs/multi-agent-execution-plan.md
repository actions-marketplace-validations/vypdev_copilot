# Multi-Agent Execution Plan

> **Status: design proposal, not current runtime architecture or an active
> implementation phase.** The current production integration remains based on
> the existing agent capability ports and OpenCode adapters. Revalidate provider
> licensing, authentication, security boundaries, and current callers before
> scheduling any Codex/Cursor implementation from this document.

## Objective

Evolve Copilot from an OpenCode-specific AI integration into a provider-agnostic execution architecture that can safely run Bugbot findings and Bugbot fixer tasks inside GitHub Actions runners.

Initial providers:

- OpenCode server or managed local OpenCode CLI/server;
- Codex SDK and Codex CLI;
- Cursor SDK and Cursor CLI, subject to the provider's supported non-interactive authentication and licensing model.

Initial task types:

- `findings`: inspect repository context and return structured findings;
- `fixer`: apply an explicitly authorized change to the checked-out workspace and return a bounded execution result.

The design must preserve the current OpenCode behavior while making provider-specific implementations replaceable, observable, testable, and safe on hosted or self-hosted GitHub runners.

## Non-goals

- Do not bundle provider SDKs or CLIs before their licensing, authentication, non-interactive support, and versioning are verified.
- Do not allow a generic agent to receive write capability merely because it can return findings.
- Do not expose provider secrets to pull requests from untrusted forks.
- Do not treat a successful model response as proof that code was safely changed, tested, committed, or pushed.
- Do not hide provider failures behind an empty response.

## Target architecture

```text
GitHub Action / CLI adapter
        |
        v
AgentApplicationService
  - FindingsUseCase
  - FixerUseCase
        |
        +--> AgentProviderFactory
                 |
                 +--> FindingsAgentPort
                 +--> FixerAgentPort
                              |
                              +--> OpenCodeAdapter
                              +--> CodexSdkAdapter
                              +--> CodexCliAdapter
                              +--> CursorSdkAdapter
                              +--> CursorCliAdapter
```

The application layer owns task semantics, authorization, workspace boundaries, retries, result validation, and commit policy. Adapters own provider protocols, process/HTTP/SDK lifecycle, and provider-specific translation.

## Canonical domain contracts

### Agent identity

```ts
type AgentProvider = 'opencode' | 'codex' | 'cursor';
type AgentTransport = 'server' | 'sdk' | 'cli';
type AgentTask = 'findings' | 'fixer';
```

Provider configuration must contain:

- provider and transport;
- pinned model identifier where applicable;
- optional server URL;
- optional executable name and pinned version;
- authentication reference by environment-variable name, never the secret value;
- capability declaration: structured output, workspace writes, command execution, cancellation, session resume.

### Invocation contract

Every invocation receives an immutable request:

- repository identity and checked-out SHA;
- task and authorization mode;
- sanitized prompt/context;
- bounded file and output budgets;
- absolute workspace root;
- cancellation signal;
- deadline and provider timeout;
- allowed verification commands, if the task is a fixer invocation.

Every invocation returns a discriminated result:

- `succeeded` with structured payload and telemetry-safe metadata;
- `skipped` with an actionable reason;
- `failed` with category, retryability, provider, operation, and partial-progress metadata;
- `cancelled` with cleanup status.

Never use `undefined` as the only failure signal at the application boundary.

### Capability model

Findings and fixer capabilities are separate. A provider may support one without the other.

Required capability checks before invocation:

- provider available;
- credentials present and scoped;
- model configured;
- task supported;
- structured output supported for findings;
- workspace write capability explicitly enabled for fixer;
- command execution capability explicitly enabled for fixer;
- runner workspace is trusted and writable;
- repository event is eligible for the requested mutation.

## GitHub Actions execution policy

### Event classification

Classify every run before starting an agent:

| Event/context | Findings | Fixer | Required handling |
|---|---:|---:|---|
| push to trusted branch | allowed | policy-dependent | checkout exact SHA; write only with explicit config |
| issue opened/edited | allowed | no implicit fixer | comments only unless separate authorized request |
| issue comment from trusted member | allowed | allowed if permissions and branch policy pass | resolve branch, verify actor, contents write |
| pull request from same repository | allowed | allowed by policy | never trust mutable refs; checkout exact head SHA/branch safely |
| pull request from fork | allowed only without secrets | disabled by default | no provider secret exposure; no write token; explain skip |
| pull request review comment | allowed | allowed only for trusted actor and trusted branch | resolve parent thread and exact head SHA |
| rerun/retry | allowed with idempotency key | allowed only with idempotency and clean workspace | do not duplicate comments, commits, or pushes |
| cancelled workflow | stop | stop immediately | terminate child/server, cleanup temporary files, do not commit partial work |

### Permissions

Use least-privilege job permissions:

- findings-only jobs: `contents: read`, issue/PR write only if comments are required;
- fixer jobs: `contents: write` only in a dedicated workflow/job with trusted actor and branch checks;
- never grant write permissions to generic pull-request workflows that execute untrusted code;
- use a dedicated PAT only where the operation cannot be performed with the job token;
- never print tokens, provider environment variables, config files, auth files, or full provider responses containing secrets.

### Workspace safety

Before invocation:

1. record repository, ref, SHA, branch, event, actor, and workspace root;
2. ensure the workspace is inside the checked-out repository and not a shared runner directory;
3. reject unsafe or ambiguous paths;
4. ensure no unrelated pre-existing changes exist for fixer tasks, or fail closed;
5. create a bounded temporary provider config outside the repository where possible;
6. record an invocation/idempotency key.

After invocation:

1. collect status and an allowlisted diff summary;
2. reject changes outside the authorized workspace boundary;
3. reject sensitive files (`.env`, credentials, SSH keys, auth stores, CI secrets, provider config containing secrets);
4. run only validated verification commands through an argument-vector executor, never a shell string;
5. commit only an allowlisted change set;
6. push only the expected branch and expected repository;
7. cleanup child processes, temporary configs, sessions, logs, and listeners in `finally`.

## OpenCode reference implementation requirements

OpenCode remains the first adapter and compatibility reference.

### Managed local server

The managed server must:

- use an explicitly pinned OpenCode package version, not floating `pnpm dlx --yes opencode-ai`;
- use the repository workspace as cwd only after workspace validation;
- bind to loopback by default;
- use a free/explicit port and verify that the resulting endpoint matches the expected process;
- validate `/global/health` and a provider/model readiness probe before accepting work;
- apply startup, readiness, request, provider, and total-run deadlines separately;
- capture bounded stderr with secret-safe redaction;
- report install/start/readiness/provider failures distinctly;
- terminate the process tree, not only the direct child, on cancellation or timeout;
- remove only files it created and never overwrite a pre-existing `opencode.json`;
- unregister process listeners after normal stop;
- be idempotent when `stop()` is called multiple times;
- clean up on success, failure, cancellation, SIGINT, SIGTERM, and startup failure.

### Remote OpenCode server

When `opencode-start-server` is false:

- validate URL syntax and an explicit allowlist policy;
- perform health/readiness checks before the first model request;
- do not send repository secrets or auth files to the server;
- document network/TLS/proxy requirements for self-hosted runners;
- classify 401/403, DNS, timeout, TLS, 429, 5xx, malformed response, and model-not-found separately;
- do not retry non-retryable authorization or configuration failures.

### OpenCode request semantics

- use separate agent IDs/contracts for findings and fixer tasks;
- require schema validation for findings and intent responses;
- bound prompt/context/response sizes;
- include session IDs only as opaque telemetry references;
- treat an empty response as a typed provider failure;
- retry only idempotent read/model operations with exponential backoff and jitter;
- never automatically replay a fixer operation after an uncertain write unless workspace state and idempotency policy prove it is safe;
- persist no provider session state in the repository.

## Codex and Cursor adapter requirements

Before implementation, verify current provider documentation and runner behavior for:

- supported SDK/CLI versions;
- Node/runtime compatibility;
- authentication variables and token scopes;
- non-interactive/headless mode;
- workspace write and command execution flags;
- structured output/schema support;
- cancellation and child-process behavior;
- rate-limit and retry semantics;
- licensing and redistribution constraints;
- whether a GitHub-hosted runner may access the service;
- whether credentials may be used for fork-originated events.

SDK adapters must not share mutable global clients between workflow invocations. CLI adapters must use `spawn` with `shell: false`, argument arrays, bounded output, process-group termination, and pinned executables.

## Configuration and migration

Introduce task-scoped configuration without breaking current OpenCode inputs:

- preserve `opencode-server-url`, `opencode-model`, and `opencode-start-server` as compatibility inputs;
- add explicit provider/transport/task configuration only after the domain contracts and validation exist;
- define precedence: task-specific configuration > provider-specific configuration > legacy OpenCode configuration > safe default;
- fail with an actionable message when the requested provider is unsupported or incomplete;
- never silently fall back from Codex/Cursor to OpenCode for fixer tasks;
- allow explicit fallback only for findings and only when configured and reported.

## Failure taxonomy and user-visible diagnostics

Every failure must include:

- phase: validation, install, startup, readiness, invocation, parse, verification, commit, push, cleanup;
- provider and task;
- retryability;
- HTTP/status/exit code where applicable;
- elapsed/deadline information;
- whether workspace changes exist;
- whether cleanup completed;
- next action for the workflow owner.

Examples:

- `OpenCode startup failed: pnpm dlx exited 1 while installing opencode-ai@X.Y.Z; no workspace changes were made.`
- `Codex fixer skipped: credential CODEX_API_KEY is unavailable for fork pull request event; run findings-only or use a trusted workflow.`
- `Fixer failed verification: pnpm run build exited 1; changes remain uncommitted and were not pushed.`

## Test strategy

### Unit tests

- provider configuration precedence and validation;
- capability checks;
- event/actor/branch authorization;
- idempotency keys and retry classification;
- path and sensitive-file boundaries;
- verification command parsing and execution;
- timeout and cancellation policies;
- result/error mapping;
- OpenCode config creation/removal and pre-existing config preservation;
- process tree shutdown and repeated stop calls.

### Adapter contract tests

Run the same contract suite against a fake provider for all adapters:

- successful findings response;
- malformed structured response;
- empty response;
- auth failure;
- rate limit;
- transient 5xx;
- timeout;
- cancellation;
- provider unavailable;
- fixer modifies allowed file;
- fixer attempts sensitive/out-of-bound file;
- verification failure;
- uncertain process exit.

### Integration tests

- fake local OpenCode HTTP server;
- fake CLI process with controlled exit/signal behavior;
- isolated temporary Git repository;
- no real credentials;
- no real provider calls in ordinary CI;
- optional manually triggered provider smoke workflow using environment-provided secrets and explicit approval.

### Workflow tests

Validate every workflow statically:

- permissions are least privilege;
- checkout ref/SHA policy is explicit;
- fork behavior is fail-closed;
- provider environment variables are not printed;
- action inputs are complete;
- cancellation and concurrency are defined;
- fixer workflows are separate from findings-only workflows where necessary.

## Delivery sequence

1. Audit current OpenCode, workflows, inputs, and runner assumptions.
2. Introduce domain contracts and typed result/error taxonomy.
3. Extract `Ai` configuration builder with legacy compatibility.
4. Introduce ports and a provider factory; migrate application use cases from `AiRepository` OpenCode calls to ports.
5. Harden managed OpenCode lifecycle and remote-server validation.
6. Separate findings and fixer authorization/capabilities.
7. Harden verification, workspace, commit, push, cancellation, and cleanup policies.
8. Add adapter/contract/integration/workflow tests.
9. Add Codex SDK/CLI adapters behind explicit opt-in.
10. Add Cursor SDK/CLI adapters behind explicit opt-in.
11. Update action inputs and workflows with migration and security documentation.
12. Run full gates, RepoWise, local isolated integration suite, and any explicitly authorized provider smoke tests.

Each step is a small commit pushed to `master` only after its relevant tests and checks pass. No provider credential or real repository data is committed.
