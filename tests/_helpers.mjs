// A throwaway project per test: a temporary folder, a git repository in it, and the CLI
// run as a real process — the same way a person, a CI job or an agent runs it.

import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BIN = join(dirname(fileURLToPath(import.meta.url)), "..", "bin", "honestdocs.mjs");

const ENV = {
  ...process.env,
  NO_COLOR: "1",
  FORCE_COLOR: "",
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@example.com",
  GIT_CONFIG_NOSYSTEM: "1",
};

export function project({ git = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "honestdocs-"));
  if (git) gitIn(dir, ["init", "-q", "-b", "main"]);

  const api = {
    dir,
    /** Run the CLI; never throws — tests look at code, stdout and stderr. */
    run(args, cwd = dir) {
      const r = spawnSync(process.execPath, [BIN, ...args], { cwd, env: ENV, encoding: "utf8" });
      return { code: r.status, stdout: r.stdout, stderr: r.stderr, json: () => JSON.parse(r.stdout) };
    },
    write(rel, content) {
      const p = join(dir, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, content);
      return p;
    },
    read: (rel) => readFileSync(join(dir, rel), "utf8"),
    git: (args, cwd = dir) => gitIn(cwd, args),
    /** Stage everything and commit, optionally at a fixed author date. */
    commit(message, { date, cwd = dir } = {}) {
      gitIn(cwd, ["add", "-A"]);
      gitIn(cwd, ["commit", "-q", "--allow-empty", "-m", message], date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {});
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
  return api;
}

function gitIn(cwd, args, extraEnv = {}) {
  return execFileSync("git", args, { cwd, env: { ...ENV, ...extraEnv }, encoding: "utf8" });
}

/** A minimal config, written by hand so tests do not depend on `init`. */
export function config(p, overrides = {}) {
  p.write("honestdocs.config.json", JSON.stringify({
    root: "devdocs",
    areas: { general: "General", rules: "Rules" },
    ...overrides,
  }, null, 2));
}

/** A document with valid frontmatter. */
export function doc(p, area, id, { type = "design", status = "draft", title = id, extra = "", body = "" } = {}) {
  return p.write(`devdocs/${area}/${id}.md`, [
    "---",
    `id: ${id}`,
    `title: ${title}`,
    `area: ${area}`,
    `type: ${type}`,
    `status: ${status}`,
    "created: 2026-01-01",
    extra,
    "---",
    body || `# ${title}\n`,
  ].filter((l) => l !== "").join("\n") + "\n");
}
