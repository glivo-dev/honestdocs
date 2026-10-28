# The honestdocs method

Development documents are a project's long-term memory: why it is built this way, what
was tried and rejected, what went wrong, what is under way, and which rules every change
must keep. They are read by people coming back after a month, by new colleagues, and —
more and more — by AI agents that start every session with an empty context.

A memory that is wrong is worse than none: someone builds from it. These ten rules are
what keep it right. The `honestdocs` command enforces the ones a machine can check.

## The rules

- **D1 The code is the truth.** A document records what was decided at the time. When it
  and the code disagree, believe the code — then come back and correct the document's
  status. A replaced document that still says it is in force is the most expensive thing
  in a docs folder.

- **D2 A field someone has to remember to update will be wrong.** So people write four
  fields — `title`, `status`, `supersedes`, `related` — and everything else is derived:
  `progress` from the checklist, `files` from git, `superseded-by` from the newer
  document, `updated` from git. `{{command}} index` derives; nobody types those.

- **D3 Write it down before building.** Non-trivial work starts with a document: a design
  for "how should this work", a plan for "what are the steps", research for "what is
  true". A small change needs none. The test is whether someone will later ask "why is it
  like this?"

- **D4 Commits name the document they serve.** A trailer line in the commit message —
  `Doc: 2026-11-02-token-rotation` — is the only link between a document and the code
  that cannot drift. A hand-kept "related files" list is out of date by the second week.

- **D5 Write down what was rejected.** Every template has *Alternatives considered*. The
  option that lost, and why, is what stops the same argument three months later — and
  stops an AI agent from proposing it again as if it were new. Before proposing a design,
  search for it: `{{command}} search <words> --section alternatives`.

- **D6 One document replaces another from the newer side.** Write
  `supersedes: [<old id>]` in the new document; the old one is marked automatically.
  Never edit the old one to point forward — one source cannot contradict itself.

- **D7 Close honestly.** A plan with unticked boxes is not done. Tick them, or write in
  the Log what happened to them. Work dropped on purpose is `abandoned`, and the reason it
  was dropped is as worth keeping as the reason anything was built.

- **D8 Living documents change in place.** References and rules are never finished; they
  are true now. When one changes, edit it and add a dated line to its Log. A second
  document beside it that says something different is how a project ends up with two
  truths.

- **D9 A rule that can be a test is one.** Rules are numbered (`R1`, `R2`, …) so they can
  be cited in a review. A rule names the test that proves it, and `{{command}} check`
  fails when that test file is gone. A rule that lives only in prose is the one that gets
  forgotten.

- **D10 Documents change with the work.** A change is not finished while the documents
  and rules it affects still describe the old behaviour. Check both before saying a batch
  is done.

## Two kinds of document

| Kind | Types | Lifecycle |
|---|---|---|
| **Work** — something gets done, then it is finished | `research`, `design`, `plan`, `decision`, `postmortem` | `draft → planned → in-progress → done`, or `abandoned`; `superseded` when replaced |
| **Living** — true now, kept true in place | `reference`, `rule` | `draft → current → retired`; `superseded` when replaced |

`planned` means decided but not started. Re-check a planned document against the code
before building from it: the code may have moved since it was written.

## Ids never change

A document's id is its filename: `YYYY-MM-DD-<slug>`. Other documents, commits and
conversations refer to it, so it is never renamed. A document that turns out to be about
something else is superseded by a new one, not renamed.

## Memory, documents and agents

People and AI agents both keep notes of their own — an agent's memory file, a personal
to-do list. Draw the line like this:

- **Preferences and habits** of one person (how they like reports, which commands they
  avoid) belong in that person's or agent's own memory.
- **Decisions about the project** — what was chosen, what was rejected, what broke and
  why — belong in the documents, where everyone, and every future session, reads the same
  thing.
- A memory entry about the project should *point* to the document, not repeat it. Two
  copies drift; a pointer does not.

## Areas

Documents live in area folders (`engine/`, `billing/`, `rules/` …) listed in the config.
The folder is the area; a document cannot claim one area while sitting in another.
`rules/` holds the rules every change must keep, and its first document is a checklist —
*before you build* — that sends each kind of change to the rules that govern it.
