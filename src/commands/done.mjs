import { UsageError, c, die, ok, parseArgs, say } from "../cli.mjs";
import { lifecycleOf, loadConfig } from "../config.mjs";
import { checklistProgress, findDoc, loadDocs, today, writeDoc } from "../docs.mjs";
import { report, runIndex } from "./index.mjs";

export const summary = "close a work document as done (or abandoned)";

export const help = `honestdocs done — ${summary}

  honestdocs done <id> [--abandoned] [--force]

Sets status and completed, then reruns the index so files and progress are final.
A checklist with unticked items is refused: either the items are done, or "done"
is not the word for what happened.

  --abandoned   the work was dropped on purpose; the reasoning is the record
  --force       close it anyway — after saying in the Log what became of the
                unticked items
`;

export function run(argv) {
  const args = parseArgs(argv, { abandoned: "boolean", force: "boolean" });
  const [id] = args._;
  if (!id) throw new UsageError("need a document id");
  const config = loadConfig();
  const doc = findDoc(loadDocs(config), id);
  if (!doc) die(`no document with the id "${id}"`);
  if (!doc.hasMeta) die(`${doc.rel} has no frontmatter`);

  if (lifecycleOf(config, doc.meta.type) !== "work") {
    die(`${id} is a ${doc.meta.type} — a living document is never finished. ` +
      "Keep it current, or retire it: `honestdocs status " + id + " retired`");
  }

  const status = args.abandoned ? "abandoned" : "done";
  const progress = checklistProgress(doc.body);
  if (status === "done" && progress && !args.force) {
    const [d, total] = progress.split("/").map(Number);
    if (d < total) {
      say(c.yellow(`! ${id} is at ${progress}.`));
      say(c.dim("  Tick the rest, or write in the Log what happened to them and pass --force."));
      say(c.dim("  If the work was dropped rather than finished: --abandoned."));
      process.exitCode = 1;
      return;
    }
  }

  doc.meta.status = status;
  doc.meta.completed = today();
  writeDoc(doc);
  ok(`${id} → ${status} (${doc.meta.completed})`);
  report(config, runIndex(config), false);
}
