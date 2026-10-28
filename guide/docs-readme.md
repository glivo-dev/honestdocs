# Development documents

Decisions, designs, plans, research, postmortems and standing rules for this project,
kept true by [honestdocs](https://github.com/glivo-dev/honestdocs).

**The code is the truth.** A document records what was decided at the time. Where it and
the code disagree, believe the code — then come back and correct the document's status.

- `INDEX.md` — every document, newest first and by area. Generated; do not edit.
- `rules/` — the rules every change must keep. Start with *before you build*.
- `<area>/YYYY-MM-DD-<slug>.md` — one document each. The filename is the id; it never
  changes.

## Working with them

```sh
# what is under way
{{command}} brief
# start a document
{{command}} new <area> <slug> --type plan --title "…"
# link the work to it
git commit -m "…" -m "{{trailer}}: <id>"
# close it
{{command}} done <id>
# derive, regenerate, validate
{{command}} index && {{command}} check
```

Write by hand only `title`, `status`, `supersedes` and `related`. The rest is derived —
`progress` from the checklist, `files` from commits carrying `{{trailer}}: <id>`,
`superseded-by` from the newer document, `updated` from git — because a field someone has
to remember to update will be wrong.

The method in full: `{{command}} guide`.
