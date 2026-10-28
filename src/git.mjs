// Everything honestdocs asks git. Each question is one `git log` over the whole history,
// parsed here, rather than one call per document — a project with a few hundred
// documents should not mean a few hundred processes.

import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { basename, join, relative } from "node:path";

const RS = "\x1e"; // starts a commit
const GS = "\x1d"; // ends its message

/** Run git; "" when it fails (not a repository, git missing). */
export function git(args, cwd) {
  try {
    return execFileSync("git", ["-c", "core.quotepath=off", ...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 512 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

/**
 * The canonical form of a path. Windows can spell one folder two ways — a short 8.3 name
 * such as `RUNNER~1` from the environment, the long name from git — and `path.relative`
 * between the two spellings walks out of the folder instead of into it.
 */
export function real(p) {
  try {
    return realpathSync.native(p);
  } catch {
    return p;
  }
}

export const toplevel = (dir) => {
  const top = git(["rev-parse", "--show-toplevel"], dir).trim();
  return top ? real(top) : null;
};

/** A shallow clone (CI's default) has no history to derive anything from. */
export const isShallow = (dir) => git(["rev-parse", "--is-shallow-repository"], dir).trim() === "true";

/**
 * The date each file under `dir` last changed in content, as `{ "area/x.md": "YYYY-MM-DD" }`
 * with paths relative to `dir`.
 *
 * A pure rename is not an edit: moving a folder of documents must not stamp all of them
 * with the date of the move, which would erase their history in one commit. So history is
 * read newest first, and a rename links the older path to the newer one — the edits made
 * under the old name still count for the file as it is called now. A file whose only
 * commit is a rename gets that commit's date.
 */
export function lastChangeDates(dir) {
  const out = git(["log", `--format=${RS}%ad`, "--date=short", "--name-status", "-M", "--relative", "--", "."], dir);
  const dates = {};
  const seen = {};
  const current = new Map(); // a path as it was then → the path it is called now
  const now = (p) => current.get(p) ?? p;
  for (const chunk of out.split(RS)) {
    const [dateLine, ...entries] = chunk.split(/\r?\n/);
    const date = dateLine.trim();
    for (const entry of entries) {
      if (!entry) continue;
      const [status, a, b] = entry.split("\t");
      if (status.startsWith("R") || status.startsWith("C")) {
        const target = now(b);
        seen[target] ??= date;
        if (status !== "R100" && status !== "C100") dates[target] ??= date;
        if (status.startsWith("R")) current.set(a, target);
      } else if (a) {
        const target = now(a);
        seen[target] ??= date;
        if (status !== "D") dates[target] ??= date;
      }
    }
  }
  for (const [p, d] of Object.entries(seen)) dates[p] ??= d;
  return dates;
}

/**
 * Files under `dir` with changes git has not committed yet, relative to `dir`. Their
 * `updated` is today: the edit is happening now, and it will be committed with today's
 * date far more often than not.
 */
export function uncommittedFiles(dir) {
  const top = toplevel(dir);
  if (!top) return new Set();
  const out = git(["status", "--porcelain=v1", "-z", "--untracked-files=all", "--", "."], dir);
  const set = new Set();
  const entries = out.split("\0");
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.length < 4) continue;
    // A rename is followed by its old path as a separate entry; skip that one.
    if (e[0] === "R" || e[0] === "C") i++;
    const rel = relative(real(dir), join(top, e.slice(3))).split("\\").join("/");
    if (!rel.startsWith("..")) set.add(rel);
  }
  return set;
}

/**
 * Which files the commits naming each document touched: `{ id: [file, …] }`, newest
 * commit first.
 *
 * A commit names a document with a trailer line — `Doc: 2026-11-02-token-rotation` — and
 * may name several, on several lines or comma-separated. The match is on the whole id:
 * `Doc: 2026-11-02-auth` must not count as a commit for `2026-11-02-auth-tokens`.
 *
 * Paths are given as they are named now: a file renamed after the commit is listed under
 * its new name. That is also what lets `exclude` — the documents folder, when it lives in
 * the same repository as the code — still recognise documents committed before the folder
 * was moved.
 */
function filesByTrailer(repo, trailer, { exclude = null, prefix = "" } = {}) {
  const out = git(["log", "-i", "-E", `--grep=^${trailer}:`, `--format=${RS}%B${GS}`, "--name-only"], repo);
  if (!out) return {};
  const now = renamesToNow(repo);
  const line = new RegExp(`^${trailer}:[ \\t]*(.+)$`, "gim");
  const result = {};
  for (const chunk of out.split(RS)) {
    const end = chunk.indexOf(GS);
    if (end < 0) continue;
    const message = chunk.slice(0, end);
    const files = chunk.slice(end + 1).split(/\r?\n/).map((s) => now(s.trim())).filter(Boolean)
      .filter((f) => !exclude || !(f === exclude || f.startsWith(exclude + "/")));
    if (!files.length) continue;
    const ids = new Set();
    for (const m of message.matchAll(line)) {
      for (const id of m[1].split(",")) if (id.trim()) ids.add(id.trim());
    }
    for (const id of ids) {
      const set = (result[id] ??= new Set());
      for (const f of files) set.add(prefix + f);
    }
  }
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, [...v]]));
}

/**
 * A function from a path as some commit named it to the path it has today, following
 * every rename in the history, newest first.
 */
function renamesToNow(repo) {
  const out = git(["log", "-M", "--diff-filter=R", "--name-status", "--format="], repo);
  const map = new Map();
  const now = (p) => map.get(p) ?? p;
  for (const entry of out.split(/\r?\n/)) {
    const [status, from, to] = entry.split("\t");
    if (status?.startsWith("R") && from && to) map.set(from, now(to));
  }
  return now;
}

/**
 * The trailer-derived files across every configured code repository. With more than one
 * repository, each path is prefixed with its repository's folder name so `app/x.ts` in
 * one is not confused with `app/x.ts` in another.
 */
export function filesForAllDocs(config) {
  const merged = {};
  const multi = config.codeRepos.length > 1;
  for (const repoDir of config.codeRepos) {
    const top = toplevel(repoDir);
    if (!top) continue;
    const rel = relative(top, real(config.docsDir)).split("\\").join("/");
    const exclude = rel && !rel.startsWith("..") ? rel : null;
    const prefix = multi ? basename(top) + "/" : "";
    const found = filesByTrailer(top, config.trailer, { exclude, prefix });
    for (const [id, files] of Object.entries(found)) {
      const set = new Set([...(merged[id] ?? []), ...files]);
      merged[id] = [...set];
    }
  }
  return merged;
}
