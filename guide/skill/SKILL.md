---
name: honestdocs
description: Keeps this project's development documents (decisions, designs, plans, research, postmortems, standing rules in {{root}}/) true with the honestdocs CLI. Use when starting a session, before designing or building something non-trivial, when committing work that a document describes, when closing out work, or when asked why something is built the way it is.
---

# Development documents with honestdocs

`{{root}}/` is the project's long-term memory. Every document is Markdown with a small
frontmatter block; `INDEX.md` is generated. **The code is the truth** — where a document
and the code disagree, believe the code and correct the document.

## When a session starts

```sh
honestdocs brief
```

Work in progress with its next unticked items, what is planned, what changed lately,
and the rules in force. Read the in-progress document you are continuing — its Log is
the hand-over from the last session.

## Before building

1. **Has this been weighed before?** `honestdocs search <words>`; with
   `--section alternatives` it shows only what was considered and rejected, with the
   reason. Superseded and abandoned documents are included on purpose. Do not propose a
   rejected option again without saying what has changed.
2. **Which rules apply?** `honestdocs rules` lists the numbered rules in force and the
   tests that prove them. Go through the `before-you-build` checklist in `{{root}}/rules/`.
3. **Open a document** for anything non-trivial:

   ```sh
   honestdocs new <area> <slug> --type design --title "Token rotation"
   ```

   Types: `design` (how it should work), `plan` (ordered steps, checklist), `research`
   (a question and sourced findings), `decision` (one choice, MADR), `postmortem` (what
   went wrong, with evidence), `reference` and `rule` (living documents, edited in place).
   Fill *Alternatives considered* — it is the part people and agents need most later.

## While building

- End every commit message that does the work with a trailer line:

  ```
  {{trailer}}: 2026-11-02-token-rotation
  ```

  That is how `honestdocs index` learns which files the document touched. Several ids:
  comma-separated or one line each.
- Tick checklist items (`- [x]`) as they land. Add dated notes to the Log.
- Never write `progress`, `files`, `superseded-by` or `updated` by hand. Write only
  `title`, `status`, `supersedes`, `related`.
- Replacing a document: `supersedes: [<old id>]` in the **new** one, then
  `honestdocs index` marks the old one.
- A rule changed: edit its rule document in place and add a Log line — never a second
  document beside it.

## Finishing

```sh
honestdocs done <id>              # refuses while checklist items are unticked
honestdocs done <id> --abandoned  # dropped on purpose; the reason goes in the Log
honestdocs status <id> current    # living documents: draft | current | retired
honestdocs index && honestdocs check
```

`check` exits 1 on anything that makes the set lie. A change is not finished while a
document or rule it affects still describes the old behaviour.

Every query command takes `--json`. The method in full: `honestdocs guide`.
