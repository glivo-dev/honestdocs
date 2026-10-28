// The document set: finding the files, reading them, and deriving the fields nobody
// should type.
//
// One rule runs through all of it: a field a person has to remember to update is a field
// that will be wrong. So `progress`, `files`, `superseded-by` and `updated` are derived —
// from the checklist in the body, from git, from the other document's `supersedes` — and
// overwritten on every `index`. Only `title`, `status`, `supersedes` and `related` are
// written by hand, because only a person knows them.

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { parse, stringify } from "./frontmatter.mjs";
import { filesForAllDocs, isShallow, lastChangeDates, toplevel, uncommittedFiles } from "./git.mjs";

/** Files in the documents folder that are about the system, not documents in it. */
const NOT_DOCUMENTS = new Set(["INDEX.md", "README.md"]);
const SKIP_DIRS = new Set([".git", "node_modules", "assets"]);

export const idOf = (file) => basename(file, ".md");
export const today = () => new Date().toISOString().slice(0, 10);

export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
}

/** Every document file, sorted, as absolute paths. */
export function listFiles(config) {
  const out = [];
  const skip = config.templatesDir;
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) {
        if (p !== skip) walk(p);
      } else if (entry.endsWith(".md") && !(dir === config.docsDir && NOT_DOCUMENTS.has(entry))) out.push(p);
    }
  };
  if (existsSync(config.docsDir)) walk(config.docsDir);
  return out.sort();
}

export const relPath = (config, file) => relative(config.docsDir, file).split("\\").join("/");

/** The area a file sits in, from its folder; null at the top level. */
export function folderArea(config, file) {
  const dir = dirname(relPath(config, file));
  return dir === "." ? null : dir.split("/")[0];
}

/** Read every document: `{ file, rel, id, meta, body }`, meta `{}` when missing (`hasMeta` false). */
export function loadDocs(config) {
  return listFiles(config).map((file) => {
    const { meta, body } = parse(readFileSync(file, "utf8"));
    return { file, rel: relPath(config, file), id: idOf(file), meta: meta ?? {}, hasMeta: !!meta, body };
  });
}

export function writeDoc(doc) {
  writeFileSync(doc.file, stringify(doc.meta) + doc.body);
}

export function findDoc(docs, id) {
  return docs.find((d) => d.id === id) ?? null;
}

/** `done/total` over `- [x]` and `- [ ]` in the body; "" when there is no checklist. */
export function checklistProgress(body) {
  const done = (body.match(/^\s*[-*] \[[xX]\]/gm) ?? []).length;
  const open = (body.match(/^\s*[-*] \[ \]/gm) ?? []).length;
  return done + open === 0 ? "" : `${done}/${done + open}`;
}

/** The unticked checklist lines, for `brief`. */
export function openItems(body) {
  return [...body.matchAll(/^\s*[-*] \[ \]\s*(.+)$/gm)].map((m) => m[1].trim());
}

/**
 * What git can tell about the set. `available` is false outside a repository and in a
 * shallow clone, where every derived value would be wrong — better to derive nothing and
 * say so than to write a wrong answer into a hundred files.
 */
export function gitFacts(config) {
  const docsTop = toplevel(config.docsDir);
  const shallow = !!docsTop && (isShallow(config.docsDir) || config.codeRepos.some((r) => toplevel(r) && isShallow(r)));
  if (!docsTop || shallow) {
    return { available: false, reason: docsTop ? "shallow clone" : "not a git repository", dates: {}, files: {}, dirty: new Set() };
  }
  return {
    available: true,
    dates: lastChangeDates(config.docsDir),
    files: filesForAllDocs(config),
    dirty: uncommittedFiles(config.docsDir),
  };
}

/**
 * Compute the derived fields for every document, in memory. Returns the documents whose
 * frontmatter changed, each with `before` and the new `meta`. Nothing is written here —
 * `index` writes, `check` only compares.
 */
export function derive(config, docs, facts = gitFacts(config)) {
  const replacedBy = new Map();
  for (const d of docs) for (const t of asList(d.meta.supersedes)) replacedBy.set(t, d.id);

  const changed = [];
  for (const d of docs) {
    if (!d.hasMeta || !d.meta.id) continue;
    const before = JSON.stringify(d.meta);
    const meta = { ...d.meta };

    const progress = checklistProgress(d.body);
    if (progress || meta.progress) meta.progress = progress;

    if (facts.available) {
      const files = facts.files[d.id] ?? [];
      if (files.length || asList(meta.files).length) meta.files = files;
      const last = facts.dirty.has(d.rel) ? today() : facts.dates[d.rel];
      if (last) meta.updated = last;
    }

    const by = replacedBy.get(d.id);
    if (by) {
      meta["superseded-by"] = by;
      // A replaced document that still says it is in force is the single most expensive
      // thing in a docs folder: someone builds from it.
      if (meta.status !== "superseded" && meta.status !== "abandoned" && meta.status !== "retired") meta.status = "superseded";
    } else if (asList(meta["superseded-by"]).length) {
      // Nothing replaces it any more — the newer document dropped its `supersedes`.
      meta["superseded-by"] = "";
    }

    if (JSON.stringify(meta) !== before) changed.push({ doc: d, before: JSON.parse(before), meta });
  }
  return changed;
}

export const asList = (v) => (Array.isArray(v) ? v : v ? [v] : []);
