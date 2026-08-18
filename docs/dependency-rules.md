# Dependency Rules and Architectural Invariants

This document defines the dependency graph that the reconstruction must enforce. The rules are executable requirements, not style preferences.

## Target direction

```text
entrypoint
  -> runtime composition root
    -> application workflow/use case
      -> semantic application port
        -> capability adapter
          -> provider client port
            -> provider SDK / HTTP / CLI / Git / filesystem
```

The dependency arrow points from the caller to the dependency. Dependencies must point outward toward details only through ports owned by the appropriate inner layer.

## Layers

### Domain

Owns:

- business models;
- value objects;
- pure policies;
- domain invariants;
- domain outcomes.

May import:

- standard TypeScript types;
- other domain modules.

Must not import:

```text
application
infrastructure
entrypoints
@actions/*
@octokit/*
fetch
child_process
process.env
process.cwd()
GitHub context
OpenCode
filesystem
logger implementations
```

### Application

Owns:

- use cases;
- workflows;
- semantic capability ports;
- application request/response contracts;
- application policies;
- orchestration of domain behavior.

May import:

```text
domain
application/ports
application/contracts
application/policies
```

Must not import:

```text
data/repository
infrastructure
@actions/*
@octokit/*
fetch
child_process
OpenCode DTOs
provider-specific agent IDs
provider-specific response parts
concrete repositories
factories
composition roots
```

### Infrastructure

Owns:

- provider adapters;
- provider client ports;
- HTTP/REST/GraphQL mapping;
- pagination;
- process execution;
- filesystem access;
- Git access;
- provider error translation;
- concrete logging.

May import:

```text
application ports/contracts
 domain contracts where needed
provider SDKs
Node runtime APIs
```

Must not import:

- entrypoint lifecycle code;
- Commander handlers;
- GitHub Action result publishing;
- unrelated provider capabilities.

### Composition

Owns:

- construction of concrete adapters;
- dependency graph assembly;
- lifecycle-specific scopes;
- runtime configuration wiring.

Composition roots may import all required outer components but must not become a new universal facade. Composition is organized by runtime and capability.

### Entrypoints

Owns:

- Commander registration;
- GitHub event/input extraction;
- local input extraction;
- request mapping;
- result rendering/publishing;
- exit and failure policies.

Entrypoints may depend on composition roots and application contracts. They must not construct provider repositories inline.

## Capability port rules

Application ports must describe semantic capabilities:

```text
FindingsAgentPort
FixerAgentPort
IssueContentPort
IssueLifecyclePort
PullRequestReviewPort
BranchComparisonPort
ProjectBoardCommandPort
RepositoryReleasePort
```

Ports must not expose:

```text
Octokit request parameters
REST endpoint names
GraphQL query strings
OpenCode parts
provider agent IDs
raw HTTP response envelopes
```

Provider client contracts may expose provider-shaped DTOs, but they stay in infrastructure and are not imported by application.

## Forbidden universal abstractions

Do not introduce replacements such as:

```text
UniversalRepository
BaseRepository
GithubEverythingClient
AiEverythingService
Pick<IssueRepository>
Pick<PullRequestRepository>
GenericProviderAdapter
```

Shared internal transport is allowed only below separate semantic adapters.

## Construction rules

Production construction is allowed only in:

```text
src/composition/**
src/infrastructure/composition/**
src/entrypoints/**  # only selecting a runtime root, never assembling provider graphs
```

Forbidden in application/domain:

```text
new RepositoryFactory()
new AiRepository()
new DefaultAgentRepositoryFactory()
new Octokit*Adapter()
new AgentCliClient()
new OpenCodeHttpClient()
```

All constructors requiring a dependency must receive it explicitly. No default concrete dependency parameters are allowed.

## Runtime separation

The following lifecycles remain independent:

```text
GitHub Action lifecycle
Local Action lifecycle
CLI lifecycle
```

They may share:

- pure input precedence policies;
- pure input normalization;
- semantic application requests;
- application use cases;
- pure result contracts.

They must not share:

- runtime failure publication;
- `core.setFailed`;
- `process.exit`;
- GitHub context extraction;
- CLI process handling;
- provider lifecycle ownership.

## Enforceable tests

The architecture suite must verify:

1. `domain` has no outer imports.
2. `application` has no `data/repository` imports.
3. `application` has no infrastructure/provider imports.
4. `application` does not construct concrete dependencies.
5. `entrypoints/cli` does not import repositories or provider adapters.
6. GitHub and local entrypoints retain separate lifecycle implementations.
7. Obsolete facades have no production callers after retirement.
8. Composition roots are the only concrete construction points.
9. Provider ports do not leak into use cases.
10. Deleted universal clients cannot be reintroduced.

## Acceptance standard

A boundary is complete only when static imports, constructor wiring, tests, Graphify edges, and runtime behavior all agree. A passing regex test alone is insufficient.
