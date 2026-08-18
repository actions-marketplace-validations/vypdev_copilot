# Graphify development workflow

## Purpose

Graphify is a complementary development tool for repository topology and code navigation. It does not participate in the Copilot runtime and is not a replacement for tests, TypeScript checks, RepoWise health, or security gates.

Use it to answer structural questions before changing code:

- Which production callers depend on a legacy repository?
- What is the shortest path between a use case and a provider adapter?
- Which nodes are architectural hubs?
- What files are affected by removing or partitioning a facade?
- Are the current ports and composition roots connected as intended?

## Installation

Install the official Graphify Labs package in an isolated Python environment. The PyPI package is named `graphifyy`; the executable is `graphify`.

```bash
python3 -m venv /tmp/copilot-graphify-venv
/tmp/copilot-graphify-venv/bin/python -m pip install 'graphifyy==0.9.46'
/tmp/copilot-graphify-venv/bin/graphify hermes install
```

Graphify is a development tool only. Do not add it to `package.json`, the pnpm lockfile, the GitHub Action bundle, or production dependencies.

## Generate the local graph

The default development graph is deterministic and AST-only:

```bash
graphify extract . --code-only --no-cluster --out .
```

This writes generated files below `graphify-out/`, which is intentionally ignored by Git. `--code-only` avoids sending documentation or source content to an LLM and requires no API key.

For a focused query:

```bash
graphify god-nodes --top 20
graphify explain "src/data/repository/ai_repository.ts"
graphify affected "src/data/repository/ai_repository.ts" --depth 2
graphify path "src/cli.ts" "src/actions/local_action.ts"
graphify query "what production callers depend on RepositoryFactory"
```

After source changes, update the AST graph without an API call:

```bash
graphify update .
```

## How Graphify is used with RepoWise

Use the tools for different questions:

```text
Graphify → topology, callers, paths, hubs, impact
RepoWise  → complexity, duplication, churn, health, risk
Tests     → behavior and contracts
Git       → published history and change verification
```

A RepoWise hotspot must not be refactored only because a number is high. First use Graphify to identify the real capability boundary and production callers, then define a semantic port, migrate callers, add contract tests, and remove the facade when no production dependency remains.

## Privacy and generated artifacts

- Never index credentials, `.env` files, auth state, databases, logs, or real user data.
- Review `.gitignore` and `.graphifyignore` before indexing a new repository.
- Keep `graphify-out/` local or publish it only as a short-lived CI artifact when the repository policy permits it.
- Do not commit generated graph files unless there is an explicit, reviewed reason to version them.

## Current Copilot spike

The initial AST-only graph for Copilot contained 471 code files, 2,327 nodes, and 6,764 edges. It identified these useful hubs:

- `Execution`: degree 221;
- `GithubClientPort`: degree 71;
- `IssueRepository`: degree 49;
- `RepositoryFactory`: degree 35;
- `runGitHubAction()`: degree 31;
- `runLocalAction()`: degree 30.

`AiRepository` had 47 connections and production callers through `agent_repository_factory.ts`, `common_action.ts`, `cli.ts`, and `repository_factory.ts`. This graph evidence will be used before the complete AI capability partition and facade removal.
