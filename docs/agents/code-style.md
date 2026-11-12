# Code style

Lint (`pnpm check`) enforces most style rules and explains each error; fix what it reports instead of reading a rule list. This file covers only what lint cannot check.

## Lint suppressions

Every `oxlint-disable` comment needs a reason after `--` (enforced by `helios/require-suppression-reason`), and unused disables are errors:

```ts
// oxlint-disable-next-line sonarjs/function-name -- visitor keys are AST node type names.
```

Fix the code before reaching for a suppression.

## Not covered by lint

- No `console.*` in shipped code (`no-console` is off in the preset). Use the logging patterns in the `review-logging-patterns` skill on the server.
- Name values that carry meaning instead of leaving magic numbers (`no-magic-numbers` is off).
- Use stable IDs, not array indices, for `key` (`react/no-array-index-key` is off).
- Catch an error only to recover from it, add context, or report it; let the rest propagate.
- Write comments for the why the code cannot show.
