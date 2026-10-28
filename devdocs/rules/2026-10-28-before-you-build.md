---
id: 2026-10-28-before-you-build
title: "Before you build: the checklist every change goes through"
area: rules
type: rule
status: current
created: 2026-10-28
updated: 2026-10-28
completed:
progress:
supersedes: []
superseded-by:
related: []
files: []
---
# Before you build: the checklist every change goes through

_Rules that every change must keep. Edit them here, in place, when they change, and add a
line to the Log. Never a second document beside this one._

## Scope

Every change to honestdocs — a command, a derived field, a check, the method, a guide.
Go down this before starting, and again before saying a batch is finished.

## Rules

- **B1** Non-trivial work has a document before it has code, and its commits carry
  `Doc: <id>`.
- **B2** A change is not finished while a document, guide or rule it affects still
  describes the old behaviour.
- **H1** No runtime dependencies: honestdocs runs through `npx` in other people's
  repositories, and every dependency is one more thing they install and trust.
  Test: `tests/package.test.mjs`
- **H2** Every command answers `--help`, and an unknown option is a usage error (exit 2),
  never silently ignored.
  Test: `tests/package.test.mjs`
- **H3** Query commands print data only on stdout, and JSON with `--json`; everything
  meant for a person goes to stderr.
  Test: `tests/cli.test.mjs`
- **H4** A derived field is never trusted from the file: `index` recomputes `progress`,
  `files`, `superseded-by` and `updated` from the body and git every time.
  Test: `tests/cli.test.mjs`
- **H5** `check` never fails on what only a later commit can settle. A commit naming a
  document moves its `files` and `updated`; those are warnings, so CI cannot demand a
  follow-up commit forever.
  Test: `tests/cli.test.mjs`
- **H6** Without usable history — no repository, a shallow clone — nothing is derived from
  git and the command says why. A wrong answer written into a hundred files is worse than
  none.
  Test: `tests/cli.test.mjs`

## The checklist

**Any change**
- ☐ Searched earlier decisions: `honestdocs search <words> --section alternatives`.
- ☐ README, `guide/` (method, agents section, skill) and `templates/` updated where the
  change shows (B2).

**A new command or option**
- ☐ `--help` text, `--json` for anything that returns data (H2, H3).
- ☐ Listed in the README's command table and, if agents should use it, in
  `guide/agents-snippet.md` and `guide/skill/SKILL.md`.

**A change to what is derived or checked**
- ☐ An end-to-end test in `tests/cli.test.mjs` that fails without the change.
- ☐ The README's "What `check` treats as an error" still true (H5).

**Before saying it works**
- ☐ `node --test` passes.
- ☐ `node bin/honestdocs.mjs index && node bin/honestdocs.mjs check` passes.

## Keeping this folder right

- A rule changes ⇒ edit it here, in place, and add a line to the Log.
- A new cross-cutting concern ⇒ a new rule document with its own letter, and its lines in
  the checklist above.

## Log

- 2026-10-28 — First rules, written with v1.
