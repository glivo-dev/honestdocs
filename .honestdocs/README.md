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
node bin/honestdocs.mjs brief
# start a document
node bin/honestdocs.mjs new <area> <slug> --type plan --title "…"
# link the work to it
git commit -m "…" -m "Doc: <id>"
# close it
node bin/honestdocs.mjs done <id>
# derive, regenerate, validate
node bin/honestdocs.mjs index && node bin/honestdocs.mjs check
```

Write by hand only `title`, `status`, `supersedes` and `related`. The rest is derived —
`progress` from the checklist, `files` from commits carrying `Doc: <id>`,
`superseded-by` from the newer document, `updated` from git — because a field someone has
to remember to update will be wrong.

The method in full: `node bin/honestdocs.mjs guide`.
