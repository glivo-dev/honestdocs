# Changelog

## 0.1.0 — unreleased

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
