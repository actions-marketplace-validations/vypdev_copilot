# Hotspot Refactoring Plan

Status: completed
Baseline: `976df3ed7ef4e41f294bef5a25980245921722fa`

## Objective

Reduce structural risk in the current RepoWise hotspots without introducing
wrapper-only abstractions or changing public behavior. Every source slice must
have a typed boundary, direct tests, regression coverage, a full local quality
gate, and its own published commit.

## Iteration sequence

1. Capture the baseline and refresh RepoWise on the published SHA.
2. Extract pure transport/model selection and OpenCode request configuration
   from `AiRepository`.
3. Extract the shared OpenCode message execution boundary used by findings and
   fixer flows, preserving task-specific prompts, agent IDs, and session IDs.
4. Extract response interpretation and retry-facing result normalization from
   `AiRepository`; retain transport effects in the repository adapter.
5. Inventory `ProjectRepository` capabilities and extract one capability-led
   adapter at a time, starting with the smallest independently testable group.
6. Compare issue and pull-request use cases and extract only genuinely shared
   policies, preserving event-specific behavior and result contracts.
7. Continue the GitHub/local composition refactor only where both roots have an
   equivalent typed mapping boundary; preserve input precedence and lifecycle.
8. Review `configuration_builders` and model constructors for real mapping
   boundaries, adding direct contract tests before changing callers.
9. Re-measure `Execution` and state-derived policies after the repository work;
   extract only new deterministic decisions exposed by the evidence.
10. Review secondary hotspots (`prepare_branches`, `common_action`, `merge`)
    and implement only cohesive policies with measurable responsibility.
11. Run the complete suite, type checking, lint, build, audit, and diff checks;
    restore generated build artifacts after the build.
12. Reindex RepoWise against the final published SHA, clean generated editor/
    MCP artifacts, verify `HEAD == origin/master`, and record remaining work.

## Acceptance criteria per slice

- Public behavior and provider envelopes remain unchanged unless a regression
  test documents an intentional contract correction.
- New policies expose small typed contracts and direct tests.
- Existing facade/use-case tests remain green to prove wiring.
- `pnpm` is used for all JavaScript/TypeScript commands.
- Full local gates pass before commit and push.
- No RepoWise reports, editor configuration, or generated analysis artifacts
  are committed.

## AiRepository composition cycle

Baseline at `9fed65d9`: focused Ai/OpenCode tests pass (`38/38`), typecheck passes, and RepoWise reports `ai_repository.ts` at score `3.18`, NLOC `129`, max CCN `13`, max nesting `4`, and `30.66%` duplication.

The next cycle targets composition and dependency direction rather than line count:

1. Inventory every concrete `AiRepository` construction and classify callers by composition root, use case, test, or CLI entrypoint.
2. Define a typed `AgentRepositoryFactory` port at the composition boundary; keep findings and fixer ports separate.
3. Add RED contract tests proving independent factory-created repositories use injected CLI/OpenCode dependencies.
4. Implement the infrastructure factory without changing provider behavior or session semantics.
5. Migrate findings use cases from concrete defaults to the factory/port boundary.
6. Migrate fixer use cases from concrete defaults to the factory/port boundary.
7. Migrate CLI composition explicitly, preserving its input/configuration lifecycle.
8. Remove obsolete direct concrete imports from application use cases and validate the dependency graph.
9. Review `getSessionDiff` as a separate read-only session capability and define its port if callers justify it.
10. Add composition/error integration tests for missing configuration, CLI failure, server failure, and independent instances.
11. Run complete gates, reindex RepoWise on the published SHA, and compare hotspot and coupling metrics.
12. Clean generated artifacts, document measured results, verify exact local/remote SHA, and select the next hotspot boundary.

Acceptance criteria: no application/use-case module constructs concrete transport adapters; `FindingsQueryPort` and `FixerQueryPort` remain separate; composition is explicit and testable; no compatibility shim is added solely to preserve an old import; every slice has focused tests, full gates, and an independently published commit.

### AiRepository composition cycle results

The composition cycle was completed and published in these slices:

- `f75c292d`: introduced `DefaultAgentRepositoryFactory` with injected CLI/OpenCode ports and separate findings/fixer capability views.
- `d93e97b6`: migrated the first cohesive group of findings/fixer use cases to the composition boundary.
- `ed3f38b5`: removed concrete `AiRepository` dependencies from the remaining findings callers.
- `04056e50`: migrated the CLI composition root to the fixer capability.
- `a3d74d76`: isolated agent task identifiers in `agent_task_policy.ts`.
- `eaa7be01`: removed the obsolete `getSessionDiff` re-export from `AiRepository`; the read-only client is consumed directly by its own tests.

The complete final hook passed with `190` suites, `1468` tests, and `1` skipped test. Final RepoWise measurements at `eaa7be01` report `ai_repository.ts` at score `3.18`, NLOC `127`, maximum CCN `13`, maximum nesting `4`, and `31.11%` duplication. Hotspot health is `5.03`, average repository health is `8.79`, and risk is `1.8` (`low`). The score and complexity remained stable while the facade lost composition-only exports and callers; this confirms a dependency-direction improvement without cosmetic partitioning.

The working tree was cleaned of generated `build/`, `.claude/`, and `.vscode/` artifacts before the documentation commit. RepoWise was measured at `eaa7be01`; the final documentation publication is verified separately after this commit.

## AiRepository hotspot sequence

Baseline at `16ea1274`: focused Ai/OpenCode tests pass (`32/32`), typecheck passes, and RepoWise reports `src/data/repository/ai_repository.ts` as the current worst performer (`2.52`).

Planned cohesive slices:

1. Extract a typed agent execution boundary for shared CLI/server transport selection while preserving task-specific response mapping.
2. Extract findings response interpretation (text, reasoning, strict JSON) as a pure policy with direct tests.
3. Extract fixer response/session mapping as a separate typed policy; do not conflate CLI's synthetic session with server sessions.
4. Centralize server configuration/model resolution at the composition boundary without changing validation or error contracts.
5. Re-read public ports and callers, remove obsolete facade-only dependencies, and retain `AiRepository` only as a compatibility adapter.
6. Run full gates and refresh RepoWise on the published SHA; compare hotspot health, NLOC/CCN, and worst-performer movement.

Acceptance criteria: each source slice has focused contract tests, preserves the existing `FindingsQueryPort`/`FixerQueryPort` behavior, passes full pnpm gates, is committed and pushed independently, and does not introduce a wrapper whose only purpose is reducing NLOC.


- `16144df4`: centralized OpenCode model reference parsing.
- `3bf32fc9`: isolated OpenCode invocation, including transport and response-interpretation retry semantics.
- `a954111b`: shared issue/pull-request project-priority application flow.
- Reviewed without extraction: ProjectRepository capability boundaries, GitHub/local action composition, constructor-only configuration builders, Execution state facade, and the transactional merge workflow. These require larger contract redesigns rather than safe mechanical extraction.

### AiRepository execution results

The four planned cohesive slices were implemented and published:

- `3616d93e`: `agent_execution_policy.ts` centralizes typed CLI/server execution, OpenCode model resolution, and response mappers while preserving task-specific semantics.
- `942d6c07`: `agent_findings_response_policy.ts` owns findings text/reasoning/strict-JSON interpretation for both CLI and server responses.
- `0079442f`: `agent_fixer_response_policy.ts` owns fixer text validation and provider session preservation; CLI continues to use the explicit synthetic `cli` session.
- `812207b9`: `isValidServerAgentConfiguration` centralizes OpenCode server configuration validation without changing facade-specific error messages.

Focused and full hooks passed after every published slice. The final hook reported `189` suites, `1467` tests, and `1` skipped test. Final RepoWise measurements on `812207b9` improved `ai_repository.ts` from score `2.52`/NLOC `156` to score `3.18`/NLOC `129`; maximum CCN is `13`, maximum nesting `4`, and duplication is `30.66%`. Average repository health moved from `8.82` to `8.83`, and hotspot health from `5.06` to `5.08`.

Remaining candidate: inspect `FindingsQueryPort`/`FixerQueryPort` callers and constructor dependencies for a real public contract boundary. No further extraction is justified until that inventory confirms an obsolete facade dependency.


Each implementation slice passed focused Jest tests, `pnpm exec tsc --noEmit`,
`pnpm run lint`, and `git diff --check`. Published commits also passed the
repository pre-commit suite/build hook. Generated `build/`, `.vscode/`, `.claude/`,
and RepoWise index artifacts remain uncommitted.

## Explicit non-goals

- No abstraction whose only purpose is reducing NLOC.
- No generic `Result` factory when payload semantics differ.
- No splitting of `ProjectRepository` by arbitrary line ranges.
- No claim of live provider or remote CI validation from local tests alone.
