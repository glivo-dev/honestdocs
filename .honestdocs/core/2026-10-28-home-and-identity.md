---
id: 2026-10-28-home-and-identity
title: A home of its own (.honestdocs/), and how the project presents itself
area: core
type: design
status: done
created: 2026-10-28
updated: 2026-10-28
completed: 2026-10-28
progress: 9/9
supersedes: []
superseded-by:
related: [2026-10-28-v1]
files: [AGENTS.md, CHANGELOG.md, README.md, assets/how-it-works-dark.svg, assets/how-it-works-light.svg, assets/logo-dark.svg, assets/logo-light.svg, assets/mark.svg, bin/honestdocs.mjs, package.json, scripts/build-assets.mjs, src/cli.mjs, src/commands/brief.mjs, src/commands/check.mjs, src/commands/guide.mjs, src/commands/init.mjs, src/commands/rules.mjs, src/config.mjs, src/docs.mjs, src/frontmatter.mjs, src/git.mjs, src/templates.mjs, tests/cli.test.mjs]
---
# A home of its own (.honestdocs/), and how the project presents itself

## Context

v1 put documents in `devdocs/` and the config in `honestdocs.config.json` at the top of the
project. Two problems surfaced on the first read-through:

- **`devdocs/` is a name projects already use.** A user with their own `devdocs/` folder
  would have had honestdocs move into it.
- **The README led with the means, not the end.** "Development documents that git keeps
  honest" made a first-time reader ask what git has to do with it — and it overstated git's
  part: of the four derived fields only `files` and `updated` come from git, and most checks
  need no history at all.

The project also had no visual identity: no logo, a README of plain sections.

## Goals / Non-goals

Goals: a default folder no project already owns; nothing added to the top of the project; a
README that says what the tool is for before how it works; a mark and logo that work in
light and dark.

Non-goals: a docs website; a social-preview image (later, when the repository is public).

## Design

- **`.honestdocs/` is the default home**, and the config moves into it as
  `.honestdocs/config.json`. Everything honestdocs owns is in one folder.
- A project that wants its documents elsewhere uses `init --root <dir>`; then the config is
  `honestdocs.config.json` at the top, as before. Both are found by walking up; both in one
  folder is an error rather than a guess.
- `init` refuses a target folder that already holds Markdown.
- **The nested private repository becomes the plain default**: ignore `.honestdocs/` in the
  code and `git init` inside it — no config change, since the config's base is the folder
  holding `.honestdocs/`.
- **Moving the documents folder must not leak.** Found while moving this repository's own
  documents: commits made before the move listed `devdocs/…` paths, which no longer looked
  like documents and appeared in `files`. Trailer paths are now translated through the
  renames git recorded, so they are excluded correctly and listed by their current names.
- **README**: tagline "Development documents that stay true."; the problem first; a
  three-step diagram (people write → honestdocs derives → check guards); git explained in its
  own collapsible section as the source of two fields.
- **Mark**: on a 16×16 pixel grid — a page whose lines are pinned to a line of history that
  runs on out of the page; the top line, true now, in green. Pixel art because it stays
  sharp at 16 px, where a line drawing blurs into a smudge.
- **Wordmark**: `honestdocs` in a bold 7-row bitmap face, all lower case — "honest" in ink,
  "docs" muted. One spelling everywhere: the logo says exactly what people type.
- **Diagram** stays in ordinary type; it carries too much text for a bitmap face.
- `scripts/build-assets.mjs` generates every image, light and dark, from one definition.

## Alternatives considered

- **Keep `devdocs/`.** It describes the content, not the tool, and survives a change of
  tool. Rejected: the collision with projects' own folders is a real cost on day one; the
  tool-named folder is an established pattern (`.changeset/` holds Markdown the same way),
  and the documents can still be moved with `--root`.
- **`honestdocs/` without the dot.** More visible. Rejected: it reads as a vendored package
  and sits among the project's own top-level folders.
- **Config stays at the top as `honestdocs.config.json`.** Rejected for the default: one
  more file in every project's root, for no gain once the folder is the tool's own.
- **Keep the git tagline.** Rejected: see Context — it led with the mechanism and
  overstated it.
- **A Mermaid diagram in the README.** Renders natively on GitHub, but with its default look
  and no control over light/dark. Rejected for hand-built SVGs.
- **A line-drawn mark with a sans-serif wordmark.** The first version. Rejected after a
  side-by-side at 64, 32 and 16 px: unreadable at favicon size, and the wordmark depended on
  whichever system font the viewer had.
- **Pixel mark with the sans-serif wordmark.** Rejected: the two styles did not belong
  together.
- **Capitals — `HONESTDOCS`, or `HonestDocs`.** Rejected: all capitals read as a shout and
  lose the word shape the ascenders give; title case gives the name two spellings (logo
  versus command, package, folder), and people would mix them. Lower case is what the user
  chose on seeing all of them.

## Checklist

- [x] `.honestdocs/` default, config inside it, both config locations found, ambiguity an error
- [x] `init` refuses a folder holding Markdown
- [x] Trailer paths follow renames
- [x] This repository's own documents moved to `.honestdocs/`
- [x] Mark, logo and diagram, light and dark, generated by a script
- [x] README rewritten; package description updated
- [x] Tests for every change above
- [x] Repository description on GitHub updated
- [x] CI green

## Verification

```sh
node --test
node scripts/build-assets.mjs     # then look at assets/ on a light and a dark background
node bin/honestdocs.mjs index && node bin/honestdocs.mjs check
```

## Log

- 2026-10-28 — Rendered the assets with headless Edge on light and dark backgrounds. First
  pass: "commits with Doc:" overflowed its card and the mark read as a generic list icon;
  fixed by "commit trailers" and the history line running out of the page.
- 2026-10-28 — Rename-following on Glivo's 259 documents: 2.8 s instead of 2.5 s; 52 more
  documents get their `files` listed under current names (`app/docs/app/asking.md` →
  `app/docs/app/asking/en.md`).
- 2026-10-28 — Compared six logo variants (line / pixel mark × sans / bitmap lower /
  bitmap capitals / title case). Chosen: pixel mark, bitmap lower case. Bitmap text is
  smeared one cell right for weight; with single-pixel strokes it looked faint beside the
  mark.
- 2026-10-28 — Cleanup before committing: twelve declarations no other file uses are no
  longer exported; two unused colour helpers removed.
