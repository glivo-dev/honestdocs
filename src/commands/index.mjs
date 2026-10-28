import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { c, emitJson, ok, parseArgs, say, warn } from "../cli.mjs";
import { loadConfig } from "../config.mjs";
import { derive, gitFacts, loadDocs, writeDoc } from "../docs.mjs";
import { renderIndex } from "../render.mjs";

export const summary = "recompute the derived fields and regenerate INDEX.md";

export const help = `honestdocs index — ${summary}

  honestdocs index [--dry-run] [--json]

Writes into each document the fields nobody should type: progress (from its
checklist), files (from commits carrying the trailer), superseded-by (from the
newer document's supersedes), updated (from git). Then regenerates INDEX.md.

  --dry-run   report what would change, write nothing
  --json      the report as JSON on stdout
`;

/** Derive, write, render. Shared by `done`, `status` and `init`, which end with an index. */
export function runIndex(config, { dryRun = false } = {}) {
  const docs = loadDocs(config);
  const facts = gitFacts(config);
  const changed = derive(config, docs, facts);
  for (const ch of changed) {
    ch.doc.meta = ch.meta;
    if (!dryRun) writeDoc(ch.doc);
  }
  const indexFile = join(config.docsDir, "INDEX.md");
  const content = renderIndex(config, docs.filter((d) => d.hasMeta));
  const indexChanged = !existsSync(indexFile) || readFileSync(indexFile, "utf8") !== content;
  if (indexChanged && !dryRun) writeFileSync(indexFile, content);
  return {
    documents: docs.length,
    git: facts.available ? "ok" : facts.reason,
    changed: changed.map((ch) => ({
      file: ch.doc.rel,
      fields: Object.keys({ ...ch.before, ...ch.meta }).filter(
        (k) => JSON.stringify(ch.before[k]) !== JSON.stringify(ch.meta[k]),
      ),
    })),
    index: indexChanged ? (dryRun ? "would change" : "written") : "unchanged",
  };
}

export function report(config, r, dryRun) {
  if (r.git !== "ok") warn(`git: ${r.git} — files and updated were left as they are`);
  if (dryRun) say(c.yellow(`dry run — ${r.changed.length} document(s) would change; INDEX.md ${r.index}`));
  else ok(`${config.root}/INDEX.md — ${r.documents} document(s), index ${r.index}`);
  for (const ch of r.changed.slice(0, 20)) say(c.dim(`  ${ch.file}: ${ch.fields.join(", ")}`));
  if (r.changed.length > 20) say(c.dim(`  … and ${r.changed.length - 20} more`));
}

export function run(argv) {
  const args = parseArgs(argv, { "dry-run": "boolean", json: "boolean" });
  const config = loadConfig();
  const r = runIndex(config, { dryRun: args["dry-run"] });
  if (args.json) emitJson(r);
  else report(config, r, args["dry-run"]);
}
