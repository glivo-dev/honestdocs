import { emitJson, parseArgs } from "../cli.mjs";
import { loadConfig } from "../config.mjs";
import { loadDocs } from "../docs.mjs";
import { parseRules } from "../rules.mjs";

export const summary = "list the rules in force, with the tests that prove them";

export const help = `honestdocs rules — ${summary}

  honestdocs rules [<id-prefix>] [--all] [--json]

Reads every document of type "rule" that is current (or still a draft) and
lists its numbered rules. Give a prefix — R, SEC — to see one family.

  --all    include retired and superseded rule documents
  --json   the full list on stdout
`;

function collectRules(config, { all = false, prefix = "" } = {}) {
  return loadDocs(config)
    .filter((d) => d.hasMeta && d.meta.type === "rule")
    .filter((d) => all || d.meta.status === "current" || d.meta.status === "draft")
    .map((d) => ({
      id: d.id,
      path: `${config.root}/${d.rel}`,
      title: d.meta.title,
      status: d.meta.status,
      rules: parseRules(d.body)
        .filter((r) => !prefix || r.id.startsWith(prefix.toUpperCase()))
        .map(({ id, text, tests, line }) => ({ id, text, tests, line })),
    }))
    .filter((d) => !prefix || d.rules.length);
}

export function run(argv) {
  const args = parseArgs(argv, { all: "boolean", json: "boolean" });
  const config = loadConfig();
  const docs = collectRules(config, { all: args.all, prefix: args._[0] ?? "" });
  if (args.json) return emitJson(docs);
  if (!docs.length) return console.log("no rule documents in force");
  const out = [];
  for (const d of docs) {
    out.push(`${d.path} — ${d.title} [${d.status}]`);
    for (const r of d.rules) {
      const text = r.text.length > 110 ? r.text.slice(0, 107) + "…" : r.text;
      out.push(`  ${r.id.padEnd(5)} ${text}${r.tests.length ? `\n        test: ${r.tests.join(", ")}` : ""}`);
    }
    out.push("");
  }
  console.log(out.join("\n").trimEnd());
}
