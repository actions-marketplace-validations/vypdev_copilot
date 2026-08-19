# Dependency Rules and Architectural Invariants

This document defines the target dependency direction, the rules enforced by
tests today, and the explicitly known transitional boundaries. A target rule
must not be described as already enforced when the current source still has a
known exception.

## Target direction

```text
entrypoint
  -> lifecycle/capability composition
    -> application workflow/use case
      -> semantic application port
        -> specialized adapter
          -> provider client contract
            -> provider SDK / HTTP / CLI / Git / filesystem
```

Inner behavior reaches outer details only through contracts owned by the
appropriate inner boundary.

## Current physical layers

### Pure model and policy subset

Pure models and deterministic policies currently live mainly under
`src/data/model/` and policy files under `src/data/repository/`. A file belongs
to this conceptual domain subset only when it imports no application use case,
provider adapter, entrypoint, SDK, process/filesystem API, or concrete logger.

Not every file under `src/data/model/` is currently pure domain. `Execution`,
`SingleAction`, and version/issue-resolution coordinators still use application
ports, use cases, constants, or logging. This is a documented transitional
model boundary, not evidence that the complete directory satisfies domain
purity.

Direct import analysis confirms an unjustified SCC: `Execution` calls
`resolveIssueBranchVersion`; the release/hotfix resolution helpers construct
three application use cases; those use cases import `Execution` again.
`Execution` and `ExecutionConfigurationPort` also import each other. These are
active defects, not approved dependency exceptions.

Pure domain/model policies may import:

- standard TypeScript types;
- other pure models and policies.

They must not import:

```text
application use cases
infrastructure
entrypoints
@actions/*
@octokit/*
provider DTOs
filesystem/process APIs
concrete logging
```

A future physical `domain/` move is justified only after the pure subset is
proved and callers can move without aliases or compatibility shims.

### Application

Application owns:

- use cases and workflows;
- semantic capability ports;
- application request/response contracts;
- orchestration and application policies.

Application production code may import application modules and approved
model/policy types. It must not import:

```text
data/repository concrete adapters
manager concrete adapters
infrastructure
entrypoints
@actions/*
@octokit/*
fetch / child_process / filesystem
provider-specific agent DTOs
concrete factories or composition roots
```

Type-only imports do not excuse semantic coupling to an outer implementation.

### Specialized adapters and infrastructure

Specialized adapters currently live mainly under `src/data/repository/`.
Provider transports and client factories live under
`src/infrastructure/github/` and `src/infrastructure/composition/`.

These layers own:

- provider mapping and DTO translation;
- REST/GraphQL documents and pagination;
- provider error classification;
- Git, process, and filesystem effects;
- concrete logging integration;
- implementation of application ports.

They must not absorb application decisions merely to share HTTP or SDK syntax.
GraphQL transport contracts remain under `src/infrastructure/github/ports/` and
must not leak into application.

### Composition

Composition owns concrete construction, dependency graph assembly, scopes, and
lifecycle-specific sharing. Current composition is split across:

```text
src/infrastructure/composition/**
src/actions/main_run_composition.ts
src/actions/main_run_dispatcher.ts
runtime entrypoints for lifecycle-local dependencies
```

The preferred direction is a named root for every non-trivial capability or
use-case graph. Phase D must audit the remaining concrete construction in
action files. Existing runtime-local construction is a known review target, not
an automatic violation: caller ownership, lifecycle, sharing, and tests decide
whether it should move.

Composition roots may depend on outer details and application contracts, but
must not become universal registries or service locators.

### Entrypoints

Entrypoints own input/event extraction, command registration, request mapping,
result publication, and runtime failure policy.

The independent lifecycles are:

```text
GitHub Action
Local action
CLI
```

They may share pure input policies, application requests/use cases, and result
contracts. They must not share GitHub context extraction, `core.setFailed`,
CLI exit handling, or provider lifecycle ownership.

## Capability port rules

Application ports describe semantic capabilities such as:

```text
ConfigurationStorePort
IssueLifecyclePort
PullRequestReviewPort
ProjectBoardCommandPort
OrganizationMembersPort
RepositoryReleasePublicationPort
```

They must not expose Octokit request parameters, endpoint names, GraphQL query
strings, OpenCode response parts, provider agent IDs, or raw response
envelopes. Provider client contracts may use provider-shaped DTOs only outside
application behavior.

## Forbidden abstractions

Do not introduce:

```text
UniversalRepository
BaseRepository
GithubEverythingClient
AiEverythingService
GenericProviderAdapter
Pick<AggregateFacade> as a substitute for a semantic port
compatibility aliases or delegating shims for retired imports
```

Shared internal transport is allowed below separate semantic adapters when
transport semantics and lifecycle are genuinely shared.

## Construction rules

Application and pure model/policy code must never construct concrete adapters.
Constructor dependencies are explicit; application constructors must not have
default concrete implementations.

Concrete construction is expected in named composition roots and may currently
occur at a documented lifecycle boundary. Before moving it, audit:

1. all callers;
2. lifecycle ownership;
3. required instance sharing;
4. failure/publication behavior;
5. focused and composition tests.

File location alone is not sufficient justification for a refactor.

## Enforced rules today

Executable tests currently verify at least:

1. application has no production imports of infrastructure or manager adapters;
2. application does not construct listed concrete repositories/factories;
3. GraphQL transport contracts do not leak into application;
4. `Execution` does not construct retired repository/identity composition;
5. CLI delegates to the local lifecycle rather than `mainRun` directly;
6. GitHub and local lifecycles remain separate;
7. shared input policies remain independent from lifecycles/infrastructure;
8. retired aggregate-facade imports do not escape approved composition areas;
9. application ports do not import technical GraphQL/provider details.

Primary tests:

- `src/application/__tests__/architecture_boundaries.test.ts`;
- `src/actions/__tests__/composition_boundaries.test.ts`;
- `src/infrastructure/composition/__tests__/facade_boundaries.test.ts`;
- boundary suites under `src/application/ports/__tests__/` and
  `src/infrastructure/**/__tests__/`.

## Known review targets

- eliminate the verified `Execution`/version-resolution/configuration SCC with
  application-owned orchestration and acyclic request/result contracts;
- add an architecture test that rejects data models importing or constructing
  application use cases;
- formalize or justify route-specific construction in
  `main_run_dispatcher.ts`;
- verify the lifecycle-local `GitCliRepository` construction in
  `local_action.ts`;
- classify the non-pure files under `src/data/model/` instead of declaring the
  entire directory a domain layer;
- strengthen architecture tests where a documented rule is not yet executable;
- audit release/tag adapter contracts before changing their structure.

## Acceptance standard

A boundary is complete only when source imports, constructor wiring, focused
behavior tests, architecture tests, Graphify topology, and runtime behavior all
agree. A passing regex test or improved RepoWise score alone is insufficient.
