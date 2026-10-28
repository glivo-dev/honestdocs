# Changelog

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
