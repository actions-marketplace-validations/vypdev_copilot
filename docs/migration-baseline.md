# Historical Migration Baseline

> This document records the original reconstruction baseline. It is not the current checkout status. For the current plan and evidence, use [`total-architecture-reconstruction-plan.md`](./total-architecture-reconstruction-plan.md).

## Snapshot identity

This baseline was captured before the first production-code change in the total reconstruction plan.

```text
Repository: /home/efraespada/copilot
Branch: master
HEAD: 4178531005881680741a694f1788253734abb831
Remote: origin/master
HEAD == origin/master: yes
Working tree: clean
```

## Graphify

Graphify was installed outside the project in a temporary Python environment:

```text
graphifyy==0.9.46
```

Command:

```bash
graphify extract /home/efraespada/copilot \
  --code-only \
  --no-cluster \
  --out /tmp/copilot-graphify-current
```

AST-only result:

```text
471 code files
2327 nodes
6764 edges
```

Important hubs:

| Symbol | Degree | Interpretation |
|---|---:|---|
| `Execution` | 221 | Possible state/workflow concentration; requires semantic audit |
| `logError()` | 204 | Shared cross-cutting dependency; do not split mechanically |
| `logDebugInfo()` | 169 | Shared cross-cutting dependency |
| `Result` | 140 | Possible universal result abstraction; audit semantics |
| `ParamUseCase` | 108 | Possible base-class concentration |
| `GithubClientPort` | 71 | Provider contract likely too broad |
| `IssueRepository` | 49 | Legacy facade still central |
| `RepositoryFactory` | 35 | Composition concentration |
| `Ai` | 34 | AI configuration/model coupling |
| `runGitHubAction()` | 31 | GitHub lifecycle concentration |
| `runLocalAction()` | 30 | Local lifecycle concentration |
| `FindingsQueryPort` | 30 | AI findings capability still linked through legacy location |
| `PullRequestRepository` | 26 | Legacy facade still central |

Important subgraphs:

```text
AiRepository       47 connections
RepositoryFactory  85 connections
cli.ts             36 connections
```

Graphify is a development aid. Its graph is not a runtime artifact and is not committed.

## RepoWise

The current index was refreshed against HEAD with:

```bash
~/.local/bin/repowise update \
  --no-workspace \
  --index-only \
  --progress json
```

Result:

```text
Files analyzed: 564
RepoWise graph: 2672 nodes, 5436 edges
Index refresh: successful
Safe dead code: 0 unreachable files, 0 unused exports
```

Health:

```text
Average health: 8.46 / 10
Hotspot health: 5.95 / 10
Maintainability average: 9.19 / 10
Maintainability hotspot: 8.53 / 10
Performance average: 9.99 / 10
```

Worst current performer:

```text
src/data/repository/ai_repository.ts
Score: 3.43
NLOC: 127
Maximum CCN: 13
Maximum nesting: 4
Duplication: 31.11%
Has test: yes
```

Other relevant RepoWise targets:

```text
src/data/repository/github/github_client_port.ts  NLOC 245, score 4.15
src/infrastructure/github/octokit_client.ts       NLOC 56, score 4.15
src/actions/common_action.ts                      NLOC 234, score 4.25
src/data/model/execution.ts                       NLOC 271, score 4.30
src/cli.ts                                        NLOC 442, score 4.40, CCN 31
src/actions/github_action.ts                      NLOC 318, score 4.40
src/actions/local_action.ts                       NLOC 277, score 4.40
src/data/repository/issue_repository.ts           NLOC 182, score 4.40
src/data/repository/branch_repository.ts          NLOC 371, score 4.65
```

RepoWise recommendations are evidence only. Duplicated prompts/tests and repeated provider DTOs will be changed only when a semantic boundary, shared policy, or common contract exists.

## Security

Working-tree security scanning is part of the final gates. Historical scanning must be run with `--history`; a non-history scan must never be described as a complete historical secret audit.

Required final commands:

```bash
~/.local/bin/repowise security scan --path . --history --format json
```

No credentials, tokens, passwords, auth state, logs, databases, or generated graph data may be committed.

## Existing verification baseline

The latest complete project gates before this plan were reported as:

```text
196 suites passed
1431 tests passed
1 skipped
TypeScript passed
ESLint passed
Coverage passed
Build passed
pnpm audit --prod passed
git diff --check passed
```

The baseline must be rerun before each large migration phase. Focused gates may pass without implying global completion.

## Baseline interpretation

The metrics identify real concentration around AI, GitHub composition, execution, CLI, and legacy facades. They do not prescribe file extraction. The desired metric improvement is a consequence of:

- fewer responsibilities per module;
- lower fan-in caused by deleting universal facades;
- narrower semantic contracts;
- lower composition duplication;
- testable boundaries;
- removal of provider leakage;
- simpler runtime lifecycles.
