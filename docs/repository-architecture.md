# Repository Architecture Target

## Purpose

This document defines the target architecture for repository capabilities in Copilot. It is a migration contract, not a request to create files mechanically. Every extraction must represent a stable semantic responsibility, preserve the public behavior, and be validated by focused tests plus the complete quality gates.

## Current verification snapshot

The current checkout is `1117a1242ea8ad3c36f0fb76aef2c6fc580afc2e`.

- Test suites: `210 passed`
- Tests: `1348 passed`, `1 skipped`
- TypeScript: pass
- ESLint: pass
- Build: pass
- Production audit: pass
- Graphify: `3170 nodes`, `8191 edges`, `206 communities`
- Graphify warning: `extensions.json` and `docs.json` produce zero nodes

RepoWise dead-code analysis is currently partial because of its
offset-naive/offset-aware datetime limitation. Its zero dead-code counts must
not be interpreted as proof of complete dead-code absence.

Generated build and editor artifacts are not part of the architecture and must remain uncommitted.

## Architectural rules

1. Application use cases depend on explicit capability ports, not concrete GitHub or Octokit repositories.
2. Infrastructure adapters own REST, GraphQL, pagination, authentication transport, and provider-specific error translation.
3. Domain/application policies remain independent of Octokit and `@actions/*`.
4. A shared component is justified only when its semantics, inputs, outputs, and failure behavior are shared.
5. Similar HTTP calls do not justify a `BaseRepository` or a generic callback repository.
6. Compatibility facades are transitional composition boundaries. New consumers must use capability ports.
7. Every migration preserves behavior first; removal of a facade happens only after its callers are migrated.
8. Naming must distinguish a GitHub Project board from a GitHub repository.
9. Ports are introduced at an application boundary, not for every private helper.
10. Tests must cover contracts, mappings, failure behavior, and composition—not only line execution.

## Target capability map

### Project board capabilities

These operations model GitHub Projects V2:

- load project details;
- resolve issue or pull request content IDs;
- determine whether content is linked;
- link content to a project;
- resolve single-select fields and options;
- update priority, size, and status/column.

Target names:

- `ProjectBoardQueryPort`
- `ProjectBoardCommandPort`
- `ProjectBoardRepository`
- `ProjectContentResolver`
- `ProjectFieldRepository`

### Organization and identity capabilities

These operations model organization membership and authenticated identity:

- list all organization members;
- select available members;
- obtain the authenticated user;
- obtain token-user details;
- authorize an actor for file modification.

Candidate ports:

- `OrganizationMembersPort`
- `AuthenticatedUserPort`
- `ActorAuthorizationPort`

They may initially share one adapter if the implementation boundary is stable, but their application contracts remain distinct.

### Repository metadata and release capabilities

These operations model the GitHub repository itself, not a GitHub Project:

- read the default branch;
- create tags;
- update or create tag references;
- create releases;
- copy/update releases.

Target names:

- `RepositoryMetadataPort`
- `RepositoryReleasePort`
- `RepositoryTagRepository`
- `RepositoryReleaseRepository`

Tag and release policies remain independent:

- `release_tag_policy.ts`
- `release_content_policy.ts`
- `release_transition_policy.ts`

### Issue capabilities

`IssueRepository` already composes several semantic repositories. The migration should preserve that decomposition and progressively expose ports:

- content and comments;
- metadata and issue/PR identity;
- labels and progress labels;
- label provisioning;
- lifecycle;
- assignments;
- issue types.

`IssueRepository` remains a transitional facade until all relevant consumers use specific ports.

### IssueRepository audit result

The audit confirms that `IssueRepository` is already a composition facade rather than a single undifferentiated adapter. Its implementation delegates to independent repositories for content/comments, metadata, labels, progress labels, label provisioning, issue types, assignments, and lifecycle. The remaining title-formatting methods are issue-specific policies at the facade boundary and do not justify a second mechanical extraction without an independent application contract and caller set.

The historical RepoWise duplication signal is therefore not treated as proof of semantic duplication. Further work should migrate callers to the existing specialized contracts only where that reduces a real dependency surface; no generic issue base repository is introduced.

### Pull request capabilities

The current pull-request implementation contains three candidate boundaries:

- changes: changed files, first diff lines, change summaries, head SHA;
- review: reviewers, review comments, threads, review creation and updates;
- lifecycle: base branch, description, linked state, branch lookup.

Candidate ports:

- `PullRequestChangesQueryPort`
- `PullRequestReviewPort`
- `PullRequestLifecyclePort`

Existing `PullRequestReviewThreadRepository` must be composed rather than duplicated.

## Infrastructure boundaries

The following shared infrastructure is allowed when it improves testability or transport consistency:

- a typed GitHub client port;
- REST and GraphQL adapters;
- cursor pagination adapter;
- explicit GitHub error classification;
- request/response mappers.

These components must not contain project, issue, release, or pull-request business decisions.

### Infrastructure audit result

The REST and GraphQL call sites were reviewed after the capability extraction. REST operations remain resource-specific Octokit calls, while GraphQL operations carry capability-specific queries and mutations. The repository already has a bounded `cursor_pagination.ts` adapter with independent tests for cursor transitions and invalid continuation states. No additional REST/GraphQL wrapper or generic pagination repository is introduced: the shared transport shape is not a shared business contract.

The GitHub Action and local CLI now share input parsing policies for delimited values, booleans, integers, thresholds, counts, and bounded comment limits. Their entry-point lifecycles and composition remain separate, and local precedence (`additionalParams` -> `actionInputs` -> YAML defaults) is preserved.

## Composition target

```text
use case
  -> capability port
    -> capability adapter
      -> GitHub REST/GraphQL adapter
        -> Octokit
```

Composition factories may assemble concrete adapters in entry points. Use cases must not instantiate concrete transport repositories.

During migration, a legacy facade may delegate to specialized adapters. The
current implementation uses explicit capability roots and specialized
adapters; historical factory/facade references must be verified against the
current checkout before being treated as active architecture.

```text
capability-specific composition root
  -> specialized adapter
  -> semantic application port
```

The facade was not the final application contract. It must not be recreated as
a universal replacement for the retired capability roots.

## Migration order

1. Capture and preserve the current baseline.
2. Enforce the documented layer invariants.
3. Define only ports required by real callers.
4. Complete the configuration boundary migration.
5. Harden high-risk adapter contracts.
6. Audit `Execution` responsibilities without metric-driven splitting.
7. Verify GitHub Action, local action, and CLI composition independently.
8. Audit Issue and pull-request facade callers where a real dependency surface remains.
9. Synchronize architecture documentation with the current checkout.
10. Reindex RepoWise, run all gates, document warnings, and remove only obsolete abstractions.

## Acceptance criteria

The migration is complete only when:

- no use case constructs concrete transport adapters;
- capability ports are explicit and type-safe;
- REST/GraphQL details stay in infrastructure;
- no generic base repository was introduced solely to reduce duplication;
- each extracted repository has focused tests;
- compatibility facades have either been removed or have a documented, necessary composition role;
- precedence and error behavior remain unchanged;
- RepoWise metrics are compared against the baseline rather than optimized blindly;
- full tests, typecheck, lint, build, and `git diff --check` pass;
- the final tree is clean and the published SHA is verified.

## Current composition and boundary status

The current entry-point topology is intentionally split:

- `src/cli.ts` parses command-line input and delegates to `runLocalAction`.
- `src/actions/local_action.ts` owns the local execution lifecycle.
- `src/actions/github_action.ts` owns the GitHub Action lifecycle and GitHub event input mapping.
- `src/actions/action_input_source.ts` contains only pure input-source policies shared by those entry points.
- `src/actions/common_action.ts` orchestrates application use cases and depends on `LatestTagQueryPort`, not on the concrete `BranchRepository` facade.
- capability-specific files under `src/infrastructure/composition/` are the
  production composition roots; no universal repository factory is treated as
  the application boundary.

These boundaries are enforced by executable architecture tests:

- `src/actions/__tests__/composition_boundaries.test.ts`;
- `src/infrastructure/composition/__tests__/facade_boundaries.test.ts`;
- `src/application/__tests__/architecture_boundaries.test.ts`.

The facade rule is deliberate: a compatibility facade may remain while it composes specialized capability adapters, but new production consumers must depend on semantic ports. Tests may instantiate concrete adapters directly to verify their contracts; that does not make them production dependencies.

## Current migration status

The first migration slices are implemented and published:

- Release and tag operations are isolated in `RepositoryReleaseRepository`.
- Project detail, content resolution and content linking are isolated in `ProjectBoardRepository`.
- Organization membership, authenticated identity and actor authorization are isolated in `OrganizationRepository`, with separate ports.
- Pull request lifecycle, changes and review operations are isolated in `PullRequestLifecycleRepository`, `PullRequestChangesRepository` and `PullRequestReviewRepository`.
- `PullRequestRepository` remains a compatibility facade composed from specialized adapters; the former `ProjectRepository` facade has been removed after its production consumers were migrated.
- `loadProjectDetails` now depends on `ProjectDetailQueryPort`, not on the `ProjectRepository` class.
- Identity, authorization, release, board, and organization callers have been migrated in published slices; `IssueRepository` has been audited and retained as a documented composition facade.
- REST/GraphQL/pagination have been audited without adding a cosmetic abstraction; shared Action/CLI input policies are explicit and tested while their lifecycles remain separate.

The Project migration is complete: entry points compose `ProjectBoardRepository`, commit-size checks receive `ProjectBoardCommandPort`, and no production consumer or compatibility test depends on `ProjectRepository`. The remaining repository migrations follow the same caller-by-caller rule: migrate callers and tests first, then remove obsolete facades only after repository-wide search confirms that no production consumer remains.
