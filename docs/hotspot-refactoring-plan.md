# Hotspot Refactoring Plan

Status: executing
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

## Execution log

- `16144df4`: centralized OpenCode model reference parsing.
- `3bf32fc9`: isolated OpenCode invocation, including transport and response-interpretation retry semantics.
- `a954111b`: shared issue/pull-request project-priority application flow.
- Reviewed without extraction: ProjectRepository capability boundaries, GitHub/local action composition, constructor-only configuration builders, Execution state facade, and the transactional merge workflow. These require larger contract redesigns rather than safe mechanical extraction.

## Validation evidence

Each implementation slice passed focused Jest tests, `pnpm exec tsc --noEmit`,
`pnpm run lint`, and `git diff --check`. Published commits also passed the
repository pre-commit suite/build hook. Generated `build/`, `.vscode/`, `.claude/`,
and RepoWise index artifacts remain uncommitted.

## Explicit non-goals

- No abstraction whose only purpose is reducing NLOC.
- No generic `Result` factory when payload semantics differ.
- No splitting of `ProjectRepository` by arbitrary line ranges.
- No claim of live provider or remote CI validation from local tests alone.
