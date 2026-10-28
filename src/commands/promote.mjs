import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { UsageError, c, die, ok, parseArgs, say } from "../cli.mjs";
import { asList, findDoc, loadDocs, writeDoc } from "../docs.mjs";
import { loadConfig } from "../config.mjs";

export const summary = "scaffold a public document from a development document";

export const help = `honestdocs promote — ${summary}

  honestdocs promote <id> --to <path.md> [--dry-run]

Creates <path.md> with the source's headings and nothing else, and links the two
both ways. The prose is not copied on purpose: a development document explains a
decision to the people who were there; a public document explains the result to
someone who was not. Translating one into the other serves neither.
`;

export function run(argv) {
  const args = parseArgs(argv, { to: "string", "dry-run": "boolean" });
  const [id] = args._;
  if (!id || !args.to) throw new UsageError("need <id> and --to <path.md>");
  const config = loadConfig();
  const doc = findDoc(loadDocs(config), id);
  if (!doc) die(`no document with the id "${id}"`);

  const out = isAbsolute(args.to) ? args.to : resolve(process.cwd(), args.to);
  const shown = relative(config.base, out).split("\\").join("/");
  if (shown.startsWith("..")) die(`--to must be inside the project (${config.base})`);
  if (existsSync(out)) die(`${shown} already exists`);

  const headings = doc.body.split(/\r?\n/).filter((l) => /^#{2,3} /.test(l));
  const skeleton = [
    `# ${doc.meta.title ?? id}`,
    "",
    `<!-- Started from the development document ${id}. Written for someone who has never`,
    "     seen this project: what it does, how to use it, what goes wrong. Why it was",
    `     chosen stays in ${config.root}/. -->`,
    "",
    ...headings.flatMap((h) => [h, "", "_TODO_", ""]),
  ].join("\n");

  if (args["dry-run"]) {
    say(c.yellow(`dry run — would write ${shown}`));
    say(skeleton);
    return;
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, skeleton);
  doc.meta.related = [...new Set([...asList(doc.meta.related), shown])];
  writeDoc(doc);
  ok(shown);
  say(c.dim(`  ${doc.rel} now lists it under related.`));
  console.log(shown);
}
