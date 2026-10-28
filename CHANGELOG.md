# Changelog

## 0.1.3 — 2026-10-28

Found by installing 0.1.2 from npm into a real project, the way a new user would.

- Every command honestdocs writes or prints now runs. `AGENTS.md`, the skill, the documents
  folder's README, the hints after `init` and messages such as "run `honestdocs index`" all
  said bare `honestdocs`, which exists only after a global install — an agent following
  AGENTS.md failed on its first step. They now use the new `command` config key, which
  `init` sets from the runner that started it (`npx`, `bunx` or `pnpm dlx`). A config
  without it means `npx honestdocs`; run `init --agents` / `--skill` to rewrite the
  sections already written.
- `new` leaves the set consistent: it writes the new document's `progress` and refreshes
  INDEX.md, so `check` passes straight after it.

## 0.1.2 — 2026-10-28

- The npm page really shows each image once. 0.1.1 fixed the README inside the package,
  but npm's page shows the README it reads after packing, which 0.1.1 had already put back.

## 0.1.1 — 2026-10-28

- The README on npm shows each image once. npm's page ignores GitHub's theme fragments
  and showed the light and the dark variant one above the other; the packed README now
  carries the light ones only.

## 0.1.0 — 2026-10-28

First version.

- Commands: `init`, `new`, `index`, `check`, `done`, `status`, `brief`, `search`,
  `rules`, `promote`, `guide`.
- Two lifecycles: work documents (`draft → planned → in-progress → done`, `abandoned`)
  and living documents (`draft → current → retired`).
- Derived fields: `progress` from checklists, `files` from commit trailers (whole-id
  match, several repositories), `superseded-by` and the superseded status from the newer
  document, `updated` from git with renames followed.
- Numbered rules in `rule` documents, with `Test:` references that `check` verifies.
- Agent support: `init --agents` (AGENTS.md section, refreshed in place), `init --skill`,
  `brief`, and `--json` on every query.
- Layouts: same repository, a nested documents repository, several code repositories.
- Documents and config live in `.honestdocs/` by default (`.honestdocs/config.json`);
  `--root` puts them elsewhere with `honestdocs.config.json` at the top. `init` refuses a
  folder that already holds Markdown.
- Paths in `files` follow later renames, so they show current names and moving the
  documents folder does not leak old document paths.
