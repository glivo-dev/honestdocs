import { UsageError, die, ok, parseArgs } from "../cli.mjs";
import { lifecycleOf, loadConfig, statusesFor } from "../config.mjs";
import { findDoc, loadDocs, today, writeDoc } from "../docs.mjs";
import { report, runIndex } from "./index.mjs";

export const summary = "move a document to another status";

export const help = `honestdocs status — ${summary}

  honestdocs status <id> <status>

Work documents:    draft · planned · in-progress   (finish with \`honestdocs done\`)
Living documents:  draft · current · retired

"superseded" is never set by hand: write \`supersedes: [<old id>]\` in the newer
document and \`honestdocs index\` marks the old one.
`;

export function run(argv) {
  const args = parseArgs(argv, {});
  const [id, status] = args._;
  if (!id || !status) throw new UsageError("need <id> and <status>");
  const config = loadConfig();
  const doc = findDoc(loadDocs(config), id);
  if (!doc) die(`no document with the id "${id}"`);
  if (!doc.hasMeta) die(`${doc.rel} has no frontmatter`);

  const allowed = statusesFor(config, doc.meta.type);
  if (!allowed) die(`${doc.rel} has an unknown type "${doc.meta.type}"`);
  if (status === "superseded") {
    die("set `supersedes: [" + id + "]` on the document that replaces it, then run `honestdocs index`");
  }
  if (status === "done" || status === "abandoned") die(`use \`honestdocs done ${id}${status === "abandoned" ? " --abandoned" : ""}\` — it checks the checklist first`);
  if (!allowed[status]) {
    die(`"${status}" is not a status for a ${doc.meta.type} (${lifecycleOf(config, doc.meta.type)}) — expected one of: ${Object.keys(allowed).filter((s) => s !== "superseded").join(", ")}`);
  }

  doc.meta.status = status;
  if (status === "retired") doc.meta.completed = today();
  writeDoc(doc);
  ok(`${id} → ${status}`);
  report(config, runIndex(config), false);
}
