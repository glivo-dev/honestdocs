# Before you build: the checklist every change goes through

_Rules that every change must keep. Edit them here, in place, when they change, and add a
line to the Log. Never a second document beside this one._

## Scope

This folder, `{{root}}/rules/`, holds the rules that belong to no single feature but that
every change has to keep — the ones that, forgotten, fail silently. Each concern gets one
rule document with its own letter (`SEC` for security, `API` for public interfaces, …).
This one is the entry point: go down it before starting, and again before saying a batch
is finished.

## Rules

- **B1** Non-trivial work has a document before it has code, and its commits carry
  `{{trailer}}: <id>`.
- **B2** A change is not finished while a document or rule it affects still describes the
  old behaviour.
- **B3** A rule that can be checked by a test names that test on a `Test:` line, so
  `honestdocs check` notices when it disappears.

## The checklist

_Add a group per kind of change your project has — a route, a database migration, a
public API, a setting — each pointing at the rule document that governs it. Start small;
add a line the first time something is forgotten._

**Any change**
- ☐ Searched for earlier decisions: `honestdocs search <words> --section alternatives`.
- ☐ The documents and rules it affects are updated in the same batch (B2).

**Before saying it works**
- ☐ The project's tests pass.
- ☐ `honestdocs index && honestdocs check` passes.

## Keeping this folder right

- A rule changes ⇒ edit its document here, in place, and add a line to its Log.
- A new cross-cutting concern ⇒ a new rule document
  (`honestdocs new rules <slug> --type rule --status current --title "…"`), its rules
  numbered with a fresh letter, and its lines added to the checklist above.

## Log
