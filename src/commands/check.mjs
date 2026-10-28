import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { c, emitJson, parseArgs, say } from "../cli.mjs";
import { lifecycleOf, loadConfig, statusesFor } from "../config.mjs";
import { asList, checklistProgress, derive, folderArea, gitFacts, loadDocs, writeDoc } from "../docs.mjs";
import { renderIndex } from "../render.mjs";
import { parseRules } from "../rules.mjs";

export const summary = "validate every document; exit 1 on any error";

export const help = `honestdocs check — ${summary}

  honestdocs check [--fix] [--json]

Errors (exit 1) are things that make the set lie or break:
  · frontmatter missing, or an id that does not match its filename
  · an area, type or status outside the config — or a status the type's
    lifecycle does not have
  · a document in one area's folder that claims another area
  · supersedes / related pointing at nothing
  · a superseded document that still says it is in force
  · a checklist whose progress was never recounted
  · a rule whose named test file does not exist, or two rules with one id
  · INDEX.md not regenerated since the frontmatter last changed

Warnings are for a person to look at: derived fields git would now answer
differently (run \`honestdocs index\`), a done document without a date, and so on.

  --fix    correct what is mechanical: the area, from the folder
  --json   { documents, errors, warnings, fixed } on stdout
`;

function runCheck(config, { fix = false } = {}) {
  const docs = loadDocs(config);
  const errors = [];
  const warnings = [];
  const fixed = [];
  const err = (d, msg) => errors.push({ file: d.rel, msg });
  const warnAt = (d, msg) => warnings.push({ file: d.rel, msg });
  const cmd = config.command;

  const ids = new Map();
  for (const d of docs) {
    if (ids.has(d.id)) err(d, `duplicate id — also ${ids.get(d.id).rel}`);
    else ids.set(d.id, d);
  }

  for (const d of docs) {
    const m = d.meta;
    if (!d.hasMeta) {
      err(d, `no frontmatter — start documents with \`${cmd} new\`, or add the block by hand`);
      continue;
    }
    if (!m.id) err(d, "missing `id`");
    else if (m.id !== d.id) err(d, `id "${m.id}" does not match the filename "${d.id}" — the filename is the id`);
    if (!m.title) err(d, "missing `title`");

    const folder = folderArea(config, d.file);
    if (!m.area) err(d, "missing `area`");
    else if (!config.areas[m.area]) err(d, `unknown area "${m.area}" — add it to the config's areas, or move the file`);
    if (folder && m.area && folder !== m.area) {
      if (fix && config.areas[folder]) {
        m.area = folder;
        writeDoc(d);
        fixed.push({ file: d.rel, msg: `area → ${folder}` });
      } else err(d, `says area "${m.area}" but lives in ${folder}/ — the folder wins (check --fix)`);
    }
    if (!folder) warnAt(d, "at the top level — it belongs in an area folder");

    if (!m.type) err(d, "missing `type`");
    else if (!config.types[m.type]) err(d, `unknown type "${m.type}"`);
    if (!m.status) err(d, "missing `status`");
    else if (config.types[m.type]) {
      const allowed = statusesFor(config, m.type);
      if (!allowed[m.status]) {
        err(d, `"${m.status}" is not a status for a ${m.type} (${lifecycleOf(config, m.type)} document) — expected one of: ${Object.keys(allowed).join(", ")}`);
      }
    }

    for (const target of asList(m.supersedes)) {
      if (target === d.id) err(d, "supersedes itself");
      else if (!ids.has(target)) err(d, `supersedes "${target}", which does not exist`);
    }
    for (const target of asList(m.related)) {
      const isPath = target.includes("/") || target.endsWith(".md");
      if (isPath) {
        if (!existsSync(resolve(config.base, target))) err(d, `related "${target}" is not a file under ${config.base}`);
      } else if (!ids.has(target)) err(d, `related "${target}", which does not exist`);
    }

    if (m.status === "superseded" && !m["superseded-by"]) {
      warnAt(d, "superseded, but nothing says by what — set `supersedes` on the newer document");
    }
    if ((m.status === "done" || m.status === "abandoned") && !m.completed && m.legacy !== true) {
      warnAt(d, `${m.status} but \`completed\` is empty — close documents with \`${cmd} done\``);
    }
    if (m.status === "done") {
      const p = checklistProgress(d.body);
      if (p && p.split("/")[0] !== p.split("/")[1]) warnAt(d, `done, but its checklist is at ${p} — say in the Log what happened to the rest`);
    }
  }

  // Rules: unique ids across every rule document, and tests that exist.
  const ruleIds = new Map();
  const roots = [config.base, ...config.codeRepos];
  for (const d of docs) {
    if (d.meta.type !== "rule") continue;
    const rules = parseRules(d.body);
    const inForce = d.meta.status === "current" || d.meta.status === "draft";
    if (!rules.length && inForce) warnAt(d, "a rule document with no rules — write them as `- **R1** …`");
    for (const r of rules) {
      const where = `${d.rel}:${r.line}`;
      if (ruleIds.has(r.id)) errors.push({ file: where, msg: `rule ${r.id} is also defined at ${ruleIds.get(r.id)}` });
      else ruleIds.set(r.id, where);
      if (!inForce) continue;
      for (const t of r.tests) {
        if (!roots.some((root) => existsSync(resolve(root, t)))) {
          errors.push({ file: where, msg: `rule ${r.id} names the test \`${t}\`, which does not exist` });
        }
      }
    }
  }

  // What the derivation would change. Fields a person could have fixed before the commit
  // are errors; fields that only a later commit can settle (git's answer moves with every
  // commit that names the document) are warnings.
  const facts = gitFacts(config);
  for (const ch of derive(config, docs.filter((d) => d.hasMeta && d.meta.id === d.id), facts)) {
    for (const k of new Set([...Object.keys(ch.before), ...Object.keys(ch.meta)])) {
      if (JSON.stringify(ch.before[k]) === JSON.stringify(ch.meta[k])) continue;
      const msg = `\`${k}\` is ${JSON.stringify(ch.before[k] ?? "")}, should be ${JSON.stringify(ch.meta[k])} — run \`${cmd} index\``;
      if (k === "status") err(ch.doc, `replaced by ${ch.meta["superseded-by"]} but still says "${ch.before.status}" — run \`${cmd} index\``);
      else if (k === "progress" || k === "superseded-by") err(ch.doc, msg);
      else warnAt(ch.doc, msg);
    }
  }

  // The index must match the frontmatter as written — not as git would now derive it —
  // so a commit can never make it stale on its own.
  const indexFile = join(config.docsDir, "INDEX.md");
  const expected = renderIndex(config, docs.filter((d) => d.hasMeta));
  if (!existsSync(indexFile)) errors.push({ file: "INDEX.md", msg: `missing — run \`${cmd} index\`` });
  else if (readFileSync(indexFile, "utf8") !== expected) {
    errors.push({ file: "INDEX.md", msg: `stale: frontmatter changed since it was generated — run \`${cmd} index\`` });
  }

  return { documents: docs.length, git: facts.available ? "ok" : facts.reason, errors, warnings, fixed };
}

export function run(argv) {
  const args = parseArgs(argv, { fix: "boolean", json: "boolean" });
  const config = loadConfig();
  const r = runCheck(config, { fix: args.fix });
  if (args.json) emitJson(r);
  else {
    if (r.git !== "ok") say(c.yellow(`! git: ${r.git} — derived fields not compared`));
    for (const f of r.fixed) say(c.green("  fixed ") + c.dim(`${f.file}: ${f.msg}`));
    for (const w of r.warnings) say(c.yellow("  warn  ") + `${w.file}: ${w.msg}`);
    for (const e of r.errors) say(c.red("  error ") + `${e.file}: ${e.msg}`);
    const tail = `${r.documents} document(s), ${r.errors.length} error(s), ${r.warnings.length} warning(s)`;
    say(r.errors.length ? c.red(`\n✗ ${tail}`) : c.green(`\n✓ ${tail}`));
  }
  if (r.errors.length) process.exitCode = 1;
}
