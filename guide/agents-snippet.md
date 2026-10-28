## Development documents (honestdocs)

This project keeps its decisions, plans, research, postmortems and standing rules in
`{{root}}/`, managed by `honestdocs`. The code is the truth: where a document and the code
disagree, believe the code and correct the document's status.

- **Starting a session:** run `{{command}} brief` — what is in progress, its next unticked
  items, what changed lately, which rules are in force.
- **Before building anything non-trivial:** run `{{command}} search <words>` (add
  `--section alternatives` to see what was already rejected, and why), read the rules a
  change touches (`{{command}} rules`), then open a document:
  `{{command}} new <area> <slug> --type design|plan|research --title "…"`.
- **While building:** put `{{trailer}}: <id>` on its own line at the end of every commit
  message that does the work. Tick the document's checklist as items land; add dated
  notes to its Log — they are the hand-over to the next session.
- **Never type** `progress`, `files`, `superseded-by` or `updated` — `{{command}} index`
  derives them. To replace a document, write `supersedes: [<old id>]` in the new one.
- **Finishing:** `{{command}} done <id>` (or `--abandoned`, with the reason in the Log),
  then `{{command}} check`. A change is not finished while a document or rule it affects
  still describes the old behaviour.
- Ids are filenames and never change. Add `--json` to any query command for
  machine-readable output. The full method: `{{command}} guide`.
