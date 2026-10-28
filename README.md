# honestdocs

**Development documents that git keeps honest.**

Every project accumulates decisions, designs, plans, research and postmortems. They are
its long-term memory — for the colleague who joins next year, for you in three months,
and for the AI agent that starts every session knowing nothing. And they rot: a plan says
"in progress" a year after it shipped, a design that was replaced still reads as current,
the "related files" list stopped being true the week it was written. Someone builds from
the wrong one.

honestdocs is a small CLI and a method that stop that. People write the parts only people
know — the reasoning, what was rejected, the status. Everything else is **derived**:
progress from the checklist, the files a document's work touched from git commit
trailers, which document replaced which, when it last changed. A `check` in CI fails when
the set starts to lie.

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
  devdocs/rules/2026-09-01-before-you-build.md — Before you build: B1…B4 (4)
  devdocs/rules/2026-09-14-security.md — Security rules: SEC1…SEC9 (9)
```

Zero dependencies. Node 20+ or Bun. Plain Markdown in your repository.

## Quick start

```sh
npx honestdocs init --agents          # config, devdocs/, a first rule document, INDEX.md,
                                      # and a section in AGENTS.md for your AI agents
npx honestdocs new general token-rotation --type plan --title "Token rotation"
```

Work on it. Commit the work with a trailer naming the document:

```sh
git commit -m "Rotate tokens on refresh" -m "Doc: 2026-11-02-token-rotation"
```

Keep it honest:

```sh
npx honestdocs index      # derive progress, files, superseded-by, updated; regenerate INDEX.md
npx honestdocs check      # exit 1 if anything in the set lies
npx honestdocs done 2026-11-02-token-rotation
```

Add it to `package.json` if you like — `"docs:check": "honestdocs check"` — or install it
globally. Everything below works the same through `npx`, `bunx` or a global install.

## What a document looks like

```markdown
---
id: 2026-11-02-token-rotation
title: Token rotation
area: auth
type: plan
status: in-progress
created: 2026-11-02
updated: 2026-11-05          ← derived from git
completed:
progress: 3/5                ← derived from the checklist
supersedes: [2026-06-10-long-lived-tokens]
superseded-by:               ← derived from the newer document
related: [2026-10-20-audit-log]
files: [src/auth/refresh.ts, src/auth/tokens.ts]   ← derived from commit trailers
---
# Token rotation

## Context
## Goals / Non-goals
## Decision
## Alternatives considered     ← what lost, and why
## Checklist
- [x] Issue a new refresh token on every refresh
…
## Verification
## Log                         ← the hand-over to the next session
```

People write four fields: `title`, `status`, `supersedes`, `related`. The rest is the
tool's job, because **a field someone has to remember to update will be wrong.**

## The method

Ten rules, short enough to remember — `honestdocs guide` prints them in full.

| | |
|---|---|
| **D1** The code is the truth | Where a document and the code disagree, believe the code, then fix the document's status. |
| **D2** Derive what can be derived | People write title, status, supersedes, related. Nothing else. |
| **D3** Write it down before building | Non-trivial work starts with a design, plan or research document. |
| **D4** Commits name their document | `Doc: <id>` — the one link between docs and code that cannot drift. |
| **D5** Write down what was rejected | *Alternatives considered* stops the same argument — and the same AI suggestion — coming back. |
| **D6** Replace from the newer side | `supersedes:` in the new document; the old one is marked for you. |
| **D7** Close honestly | Unticked boxes are explained, not ignored. Abandoned work keeps its reasons. |
| **D8** Living documents change in place | References and rules are edited, never contradicted by a second copy. |
| **D9** A rule that can be a test is one | Numbered rules name their tests; `check` fails when a test disappears. |
| **D10** Documents change with the work | A change is not done while its documents describe the old behaviour. |

### Two kinds of document

| Kind | Types | Lifecycle |
|---|---|---|
| **Work** — gets done, then finished | `research` `design` `plan` `decision` `postmortem` | `draft → planned → in-progress → done` · `abandoned` · `superseded` |
| **Living** — true now, kept true | `reference` `rule` | `draft → current → retired` · `superseded` |

A standing rule is never "done", and forcing it through a work lifecycle leaves it in
`draft` forever while everyone follows it. So living documents have their own.

### Rules, and the tests that prove them

`rules/` holds what every change must keep — security, public APIs, migrations, whatever
your project forgets when nobody is looking. Rules are numbered so a review can cite them,
and a rule names the test that proves it:

```markdown
- **SEC3** Every route checks the item it names, not just the caller.
  Test: `tests/routes/item-scope.test.ts`
```

`honestdocs check` fails if `tests/routes/item-scope.test.ts` no longer exists.
`honestdocs rules` lists every rule in force; `init` starts you with a *before you build*
checklist that sends each kind of change to the rules that govern it.

## Commands

| Command | |
|---|---|
| `init` | Set up: config, documents folder, first rule document, INDEX.md. `--agents` writes the AGENTS.md section, `--skill` installs the agent skill. |
| `new <area> <slug> --title …` | Start a document from its type's template. Prints the path. |
| `index` | Derive the derived fields and regenerate `INDEX.md`. |
| `check` | Validate everything; exit 1 on errors. `--fix` corrects the mechanical ones. |
| `done <id>` | Close a work document. Refuses unticked items unless `--force`; `--abandoned` for dropped work. |
| `status <id> <status>` | Move a document — e.g. a rule to `current`, or `retired`. |
| `brief` | One page: in progress with next items, planned, recently changed, rules in force. |
| `search <words…>` | Search every document, superseded and abandoned included. `--section alternatives` shows what was rejected. |
| `rules [prefix]` | The numbered rules in force, with their tests. |
| `promote <id> --to <path>` | Start a public document from a development one — headings only, on purpose. |
| `guide [method\|agents\|skill]` | Print the method, the agents section or the skill. |

Every query takes `--json`. Diagnostics go to stderr; stdout carries only data.

### What `check` treats as an error

- frontmatter missing; an id that does not match its filename; duplicate ids
- an area, type or status outside the config — or a status the type's lifecycle lacks
- a document in one area's folder claiming another area
- `supersedes` or `related` pointing at nothing
- a superseded document that still claims to be in force
- a checklist count, or `superseded-by`, never recomputed
- a rule naming a test that does not exist; two rules with one id
- `INDEX.md` not regenerated since the frontmatter changed

A commit that names a document makes its `files` and `updated` out of date by
definition — git's answer moves with every commit — so those are warnings, settled by the
next `index`, never a reason for CI to fail.

## Working with AI agents

The documents are most valuable to the reader with the least memory. `init --agents` adds
a section to `AGENTS.md` (or `--agents-file CLAUDE.md`) that tells an agent to:

1. run `honestdocs brief` when a session starts;
2. `search` before proposing a design — including `--section alternatives`, so it does not
   re-propose what was rejected — and read the rules a change touches;
3. open a document for non-trivial work and put `Doc: <id>` in its commits;
4. never write the derived fields; close with `done` and `check`.

`init --skill` installs the same instructions as a skill at
`.claude/skills/honestdocs/SKILL.md`. Re-running either refreshes it in place.

**Memory versus documents.** Agents and people keep notes of their own. Preferences and
habits belong there. Decisions about the project belong in the documents, where every
person and every future session reads the same thing — a memory entry about the project
should point to the document, not copy it.

## Layouts

**Same repository** (the default): documents in `devdocs/` next to the code.

**A separate documents repository**, nested in the code and ignored by it — useful when
the code is public and the design discussion is not:

```json
{ "root": ".devdocs", "codeRepos": ["."] }
```

with `.devdocs/` in the code repository's `.gitignore` and its own `git init`. Dates come
from the documents' repository; files from the code's.

**Several code repositories, one documents set** — a workspace of sibling repositories:

```json
{ "root": "devdocs", "codeRepos": ["app", "web", "plugins"] }
```

Files are then listed as `app/src/x.ts`, `web/src/x.ts`.

## Configuration

`honestdocs.config.json`, found by walking up from the current directory:

```jsonc
{
  "root": "devdocs",                      // the documents folder
  "title": "Development documents",       // heading of INDEX.md
  "areas": {                              // folder → what belongs there
    "general": "Anything not yet in a narrower area",
    "rules": "Standing rules every change must keep"
  },
  "trailer": "Doc",                       // the commit trailer key
  "codeRepos": ["."],                     // where trailer commits are read from
  "templates": "devdocs/_templates",      // optional: your own <type>.md templates
  "types": {                              // optional: add or remove types
    "rfc": { "lifecycle": "work", "description": "A proposal for review" },
    "postmortem": false
  },
  "recent": 25                            // rows in INDEX.md's "Recently changed"
}
```

Templates may use `{{title}}`, `{{id}}` and `{{date}}`. Bodies can be written in any
language; filenames and frontmatter stay in plain ASCII so every tool can read them.

## In CI

Derived fields need history, so check out the whole of it:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
- uses: actions/setup-node@v4
  with:
    node-version: 22
- run: npx honestdocs check
```

In a shallow clone honestdocs says so and skips everything it would derive from git,
rather than writing a wrong answer.

## How it relates to other tools

- **ADR tools** (adr-tools, log4brains, MADR): honestdocs's `decision` template follows
  MADR, so ADRs fit in as one type among several. What it adds is the other kinds of
  document, the lifecycles, and fields derived from git instead of maintained by hand.
- **Spec-driven development kits** (Spec Kit, OpenSpec, …): they structure what an agent
  is told *before* it writes code. honestdocs keeps the record true *after* — what was
  decided, what was rejected, what shipped, what was replaced. They work side by side.
- **Big-project processes** (RFCs, PEPs, KEPs): the same idea at a smaller scale, without
  the metadata somebody has to keep in sync by hand.

## Where it comes from

honestdocs was built while making [Glivo](https://github.com/glivo-dev), a desktop
automation app developed with AI coding agents, where a few hundred development documents
had to stay trustworthy for people and agents alike. This is that system, made general.

## License

MIT
