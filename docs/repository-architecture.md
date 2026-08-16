# Repository Architecture Target

## Purpose

This document defines the target architecture for repository capabilities in Copilot. It is a migration contract, not a request to create files mechanically. Every extraction must represent a stable semantic responsibility, preserve the public behavior, and be validated by focused tests plus the complete quality gates.

## Baseline

The baseline was captured before this migration on the current `master` commit.

- Test suites: `190 passed`
- Tests: `1468 passed`, `1 skipped`
- TypeScript: pass
- ESLint: pass
- Build: pass
- RepoWise average health: `8.79`
- RepoWise hotspot health: `5.03`
- Current worst performer: `src/data/repository/ai_repository.ts`, score `3.18`
- Change risk: `1.3`, low

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

## Composition target

```text
use case
  -> capability port
    -> capability adapter
      -> GitHub REST/GraphQL adapter
        -> Octokit
```

Composition factories may assemble concrete adapters in entry points. Use cases must not instantiate concrete transport repositories.

During migration, a legacy facade may delegate to specialized adapters:

```text
ProjectRepository (temporary facade)
  -> ProjectBoardRepository
  -> Organization adapter
  -> RepositoryReleaseRepository
```

The facade is not the final application contract.

## Migration order

1. Capture and preserve baseline.
2. Document this target and its invariants.
3. Define only the ports required by real callers.
4. Extract repository metadata/release capability behind a compatibility facade.
5. Migrate release/tag callers to `RepositoryReleasePort`.
6. Extract Project Board capability and its content/field boundaries.
7. Migrate project board callers.
8. Extract organization, identity, and authorization capabilities.
9. Partition pull-request changes, review, and lifecycle capabilities.
10. Audit IssueRepository consumers and remove unnecessary facade dependencies.
11. Compare GitHub Action and local CLI input composition through explicit input-source ports.
12. Reindex RepoWise, run all gates, document the result, and remove only obsolete facades.

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

## Current migration status

The first migration slices are implemented and published:

- Release and tag operations are isolated in `RepositoryReleaseRepository`.
- Project detail, content resolution and content linking are isolated in `ProjectBoardRepository`.
- Organization membership, authenticated identity and actor authorization are isolated in `OrganizationRepository`, with separate ports.
- Pull request lifecycle, changes and review operations are isolated in `PullRequestLifecycleRepository`, `PullRequestChangesRepository` and `PullRequestReviewRepository`.
- `ProjectRepository` and `PullRequestRepository` remain compatibility facades composed from those adapters.
- `loadProjectDetails` now depends on `ProjectDetailQueryPort`, not on the `ProjectRepository` class.
- Identity, authorization, release, board, and organization callers have been migrated in published slices; `IssueRepository` has been audited and retained as a documented composition facade.

The next migration boundary is caller-by-caller replacement of the remaining compatibility-facade dependencies. Each caller must be migrated together with its tests and composition path; the facades must not be removed until repository-wide search shows no production consumers.
