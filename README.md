<p align="center">
  <img src="assets/logo-light.svg#gh-light-mode-only" alt="honestdocs" width="422">
  <img src="assets/logo-dark.svg#gh-dark-mode-only" alt="honestdocs" width="422">
</p>

<h3 align="center">Development documents that stay true.</h3>

<p align="center">
  Decisions, designs, plans, research, postmortems and standing rules —<br>
  kept honest for the people on your team and the AI agents working beside them.
</p>

<p align="center">
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-16a34a"></a>
  <img alt="Node 20+ or Bun" src="https://img.shields.io/badge/node-%E2%89%A520%20%C2%B7%20bun-1f2328">
  <img alt="Zero dependencies" src="https://img.shields.io/badge/dependencies-0-1f2328">
  <img alt="Windows, macOS, Linux" src="https://img.shields.io/badge/os-windows%20%C2%B7%20macos%20%C2%B7%20linux-1f2328">
</p>

---

A project's development documents are its long-term memory — for the colleague who joins
next year, for you in three months, for the AI agent that starts every session knowing
nothing. And they rot. A plan says *in progress* a year after it shipped. A design that was
replaced still reads as current. The "related files" list stopped being true the week it
was written. Someone builds from the wrong one.

**honestdocs** is a small CLI and a ten-rule method that stop that. People write only what
people know. The tool works out the rest, and fails CI the moment the set starts to lie.

<p align="center">
  <img src="assets/how-it-works-light.svg#gh-light-mode-only" alt="People write title, status, supersedes, related and the reasoning. honestdocs derives progress from the checklist, files from commit trailers, updated from git history, superseded-by from the newer document. check fails CI when the set lies." width="880">
  <img src="assets/how-it-works-dark.svg#gh-dark-mode-only" alt="People write title, status, supersedes, related and the reasoning. honestdocs derives progress from the checklist, files from commit trailers, updated from git history, superseded-by from the newer document. check fails CI when the set lies." width="880">
</p>

Plain Markdown in your repository. No server, no database, no dependencies.

## Quick start

```sh
npx honestdocs init --agents
```

That creates `.honestdocs/` — its config, a README, a first rule document and an index —
and adds a short section to `AGENTS.md` so your AI agents follow the method too. Nothing
else in your project is touched.

```sh
npx honestdocs new general token-rotation --type plan --title "Token rotation"
```

Do the work. When you commit it, add one line naming the document:

```sh
git commit -m "Rotate tokens on refresh" -m "Doc: 2026-11-02-token-rotation"
```

Then let the tool keep the record straight:

```sh
npx honestdocs index        # work out progress, files, superseded-by, updated; rebuild INDEX.md
npx honestdocs check        # exit 1 if anything in the set lies
npx honestdocs done 2026-11-02-token-rotation
```

## What you get back

**Where things stand, in one page** — what a person back from a week away, or an agent
with an empty context, reads first:

```text
$ honestdocs brief
Development documents — 41 documents

In progress
  🔧 2026-11-02-token-rotation — Token rotation (3/5)
      - [ ] Revoke old tokens after the grace period
      - [ ] Document the rotation endpoint

Planned — re-check against the code before building
  📋 2026-10-20-audit-log — Audit log for admin actions

Rules in force — read the ones a change touches before building
  .honestdocs/rules/2026-09-01-before-you-build.md — Before you build: B1…B4 (4)
  .honestdocs/rules/2026-09-14-security.md — Security rules: SEC1…SEC9 (9)
```

**What was already tried, and why it lost** — superseded and abandoned documents included,
because that is where the rejected ideas live:

```text
$ honestdocs search redis --section alternatives
🔧 .honestdocs/billing/2026-10-03-rate-limits.md — Rate limits
    § Alternatives considered: Redis counters were rejected: one more service to run…
```

**A document whose bookkeeping does itself:**

```markdown
---
id: 2026-11-02-token-rotation
title: Token rotation
area: auth
type: plan
status: in-progress
created: 2026-11-02
updated: 2026-11-05            ← from git
completed:
progress: 3/5                  ← from the checklist
supersedes: [2026-06-10-long-lived-tokens]
superseded-by:                 ← from the newer document
related: [2026-10-20-audit-log]
files: [src/auth/refresh.ts, src/auth/tokens.ts]   ← from commits naming this document
---
# Token rotation

## Context
## Goals / Non-goals
## Decision
## Alternatives considered       ← what lost, and why
## Checklist
## Verification
## Log                           ← the hand-over to the next session
```

## The method

Ten rules, short enough to remember. `honestdocs guide` prints them in full.

| | |
|---|---|
| **D1** The code is the truth | Where a document and the code disagree, believe the code — then correct the document. |
| **D2** Derive what can be derived | People write `title`, `status`, `supersedes`, `related`. A field someone must remember to update will be wrong. |
| **D3** Write it down before building | Non-trivial work starts with a design, plan or research document. |
| **D4** Commits name their document | `Doc: <id>` — the one link between documents and code that cannot drift. |
| **D5** Write down what was rejected | *Alternatives considered* stops the same argument — and the same AI suggestion — coming back. |
| **D6** Replace from the newer side | `supersedes:` in the new document; the old one is marked for you. |
| **D7** Close honestly | Unticked boxes are explained, not ignored. Abandoned work keeps its reasons. |
| **D8** Living documents change in place | References and rules are edited, never contradicted by a second copy. |
| **D9** A rule that can be a test is one | Numbered rules name their tests; `check` fails when a test disappears. |
| **D10** Documents change with the work | A change is not done while its documents describe the old behaviour. |

### Two kinds of document

| Kind | Types | Lifecycle |
|---|---|---|
| **Work** — gets done, then is finished | `research` `design` `plan` `decision` `postmortem` | `draft → planned → in-progress → done` · `abandoned` · `superseded` |
| **Living** — true now, kept true | `reference` `rule` | `draft → current → retired` · `superseded` |

A standing rule is never "done". Forced through a work lifecycle, it sits in `draft` forever
while everyone follows it — so living documents get their own.

### Rules that prove themselves

`.honestdocs/rules/` holds what every change must keep: security, public APIs, migrations —
whatever your project forgets when nobody is looking. Rules are numbered so a review can
cite them, and each names the test that proves it:

```markdown
- **SEC3** Every route checks the item it names, not just the caller.
  Test: `tests/routes/item-scope.test.ts`
```

If that test file disappears, `honestdocs check` fails. `init` starts you with a *before you
build* checklist that sends each kind of change to the rules that govern it.

## Built for AI agents

The documents matter most to the reader with the least memory. `init --agents` writes a
section into `AGENTS.md` (or `--agents-file CLAUDE.md`), and `init --skill` installs the
same instructions as a skill. An agent that follows them:

1. runs `honestdocs brief` when a session starts;
2. `search`es before proposing a design — with `--section alternatives`, so it does not
   bring back what was rejected — and reads the rules a change touches;
3. opens a document for non-trivial work and puts `Doc: <id>` in its commits;
4. never writes the derived fields; closes with `done` and `check`.

Every query takes `--json`. Data goes to stdout, everything else to stderr.

> **Memory or documents?** Agents and people keep notes of their own. Preferences and habits
> belong there. Decisions about the project belong in the documents, where every person and
> every future session reads the same thing — a memory entry about the project should point
> to the document, not copy it.

## Commands

| Command | |
|---|---|
| `init` | Set up `.honestdocs/`. `--agents` writes the AGENTS.md section, `--skill` installs the skill; both refresh in place when run again. |
| `new <area> <slug> --title …` | Start a document from its type's template. Prints the path. |
| `index` | Work out the derived fields and rebuild `INDEX.md`. |
| `check` | Validate everything; exit 1 on errors. `--fix` corrects the mechanical ones. |
| `done <id>` | Close a work document. Refuses unticked items unless `--force`; `--abandoned` for dropped work. |
| `status <id> <status>` | Move a document — a rule to `current`, a reference to `retired`. |
| `brief` | One page: in progress with next items, planned, recently changed, rules in force. |
| `search <words…>` | Every document, superseded and abandoned included. `--section alternatives` for what was rejected. |
| `rules [prefix]` | The numbered rules in force, with their tests. |
| `promote <id> --to <path>` | Start a public document from a development one — headings only, on purpose. |
| `guide [method\|agents\|skill]` | Print the method, the agents section or the skill. |

<details>
<summary><b>What <code>check</code> treats as an error</b></summary>

- frontmatter missing; an id that does not match its filename; two documents with one id
- an area, type or status outside the config — or a status the type's lifecycle lacks
- a document in one area's folder claiming another area
- `supersedes` or `related` pointing at nothing
- a superseded document that still claims to be in force
- a checklist count, or `superseded-by`, never recomputed
- a rule naming a test that does not exist; two rules with one id
- `INDEX.md` not rebuilt since the frontmatter changed

A commit that names a document moves that document's `files` and `updated` by definition,
so those are warnings, settled by the next `index` — never a reason for CI to fail.

</details>

<details>
<summary><b>How git is used</b></summary>

Two of the derived fields come from history, because history is the one record nobody
edits after the fact:

- **`files`** — every commit whose message carries `Doc: <id>` contributes the files it
  changed. Several ids per commit are fine, comma-separated or one per line. The match is on
  the whole id, and paths follow later renames, so a file is listed by the name it has now.
- **`updated`** — the last commit that changed the document's content. Moving a folder of
  documents is not an edit and does not restamp them.

Everything else — progress, superseded-by, every check — works from the files alone.
Outside a repository, or in a shallow clone, honestdocs says so and leaves the two git
fields as they are rather than writing a wrong answer.

</details>

## Layouts

<details>
<summary><b>Same repository</b> — the default</summary>

`.honestdocs/` sits next to your code and is committed with it. Its config is
`.honestdocs/config.json`.

</details>

<details>
<summary><b>A private documents repository inside public code</b></summary>

When the code is open and the design discussion is not: add `.honestdocs/` to the code's
`.gitignore` and `git init` inside it. Dates then come from the documents' repository, and
`files` from the code's (`"codeRepos": [".."]` is not needed — paths are read from the
project folder that holds `.honestdocs/`).

</details>

<details>
<summary><b>Several code repositories, one set of documents</b></summary>

For a workspace of sibling repositories:

```json
{ "codeRepos": ["app", "web", "plugins"] }
```

Files are then listed as `app/src/x.ts`, `web/src/x.ts`.

</details>

<details>
<summary><b>Documents somewhere else</b></summary>

`honestdocs init --root docs/dev` keeps them in `docs/dev/` and puts the config at the top
of the project as `honestdocs.config.json`. `init` refuses a folder that already holds
Markdown, so your own documents are never overwritten.

</details>

## Configuration

<details>
<summary><code>.honestdocs/config.json</code></summary>

```jsonc
{
  "title": "Development documents",       // heading of INDEX.md
  "areas": {                              // folder → what belongs there
    "general": "Anything not yet in a narrower area",
    "rules": "Standing rules every change must keep"
  },
  "trailer": "Doc",                       // the commit trailer key
  "codeRepos": ["."],                     // where trailer commits are read from
  "templates": ".honestdocs/_templates",  // optional: your own <type>.md templates
  "types": {                              // optional: add or remove types
    "rfc": { "lifecycle": "work", "description": "A proposal for review" },
    "postmortem": false
  },
  "recent": 25,                           // rows in INDEX.md's "Recently changed"
  "root": ".honestdocs"                   // where the documents live (with a top-level config)
}
```

Templates may use `{{title}}`, `{{id}}` and `{{date}}`. Write the bodies in any language;
filenames and frontmatter stay plain ASCII so every tool can read them.

</details>

## In CI

`files` and `updated` need history, so check out all of it:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx honestdocs check
```

## How it relates to other tools

- **ADR tools** — adr-tools, log4brains, the MADR template. honestdocs's `decision`
  template follows MADR, so ADRs fit in as one type among several. It adds the other kinds of
  document, two lifecycles, and fields that are worked out instead of maintained.
- **Spec-driven kits** — Spec Kit, OpenSpec and others shape what an agent is told *before*
  it writes code. honestdocs keeps the record true *after*: what was decided, what was
  rejected, what shipped, what was replaced. They work side by side.
- **RFC, PEP and KEP processes** — the same idea at project scale, without the metadata
  somebody has to keep in sync by hand.

## Where it comes from

honestdocs was built while making [Glivo](https://github.com/glivo-dev), a desktop automation
app developed alongside AI coding agents, where a few hundred development documents had to
stay trustworthy for people and agents alike. This is that system, made general.

## License

[MIT](LICENSE)
