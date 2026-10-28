import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { UsageError, c, die, emitJson, ok, parseArgs, say } from "../cli.mjs";
import { loadConfig, statusesFor } from "../config.mjs";
import { loadDocs, slugify, today } from "../docs.mjs";
import { stringify } from "../frontmatter.mjs";
import { fill, templateFor } from "../templates.mjs";

export const summary = "start a document";

export const help = `honestdocs new — ${summary}

  honestdocs new <area> <slug> --title "<title>" [--type <type>]

Writes <root>/<area>/<YYYY-MM-DD>-<slug>.md with its frontmatter filled in and
the body template for its type, and prints the path on stdout.
With a single area configured, <area> may be left out.

  --type <type>        default: design
  --status <status>    default: draft
  --supersedes <id>    this document replaces <id> (repeatable)
  --related <id>       a related document or path (repeatable)
  --dry-run            print what would be written, write nothing
  --json               { id, path, type, status } on stdout
`;

export function run(argv) {
  const args = parseArgs(argv, {
    type: "string", title: "string", status: "string",
    supersedes: "list", related: "list", "dry-run": "boolean", json: "boolean",
  });
  const config = loadConfig();
  const areas = Object.keys(config.areas);

  let [area, rawSlug] = args._;
  if (args._.length === 1 && areas.length === 1) [area, rawSlug] = [areas[0], args._[0]];
  if (!area || !rawSlug) throw new UsageError("need <area> and <slug>");
  if (!areas.includes(area)) die(`unknown area "${area}" — expected one of: ${areas.join(", ")}`);

  const type = args.type ?? "design";
  if (!config.types[type]) die(`unknown type "${type}" — expected one of: ${Object.keys(config.types).join(", ")}`);

  const statuses = statusesFor(config, type);
  const status = args.status ?? "draft";
  if (!statuses[status]) die(`"${status}" is not a status for a ${type} — expected one of: ${Object.keys(statuses).join(", ")}`);

  if (!args.title) throw new UsageError('need --title "…" — an index of ids nobody can read is no index');

  const slug = slugify(rawSlug);
  if (!slug) die(`"${rawSlug}" leaves nothing usable for a filename — use letters and digits`);
  const id = `${today()}-${slug}`;
  const docs = loadDocs(config);
  if (docs.some((d) => d.id === id)) die(`a document with the id ${id} already exists`);
  for (const target of args.supersedes) {
    if (!docs.some((d) => d.id === target)) die(`--supersedes ${target}: no document has that id`);
  }

  const meta = {
    id,
    title: args.title,
    area,
    type,
    status,
    created: today(),
    updated: today(),
    completed: "",
    progress: "",
    supersedes: args.supersedes,
    "superseded-by": "",
    related: args.related,
    files: [],
  };
  const content = stringify(meta) + fill(templateFor(config, type), { title: args.title, id, date: today() });
  const file = join(config.docsDir, area, `${id}.md`);
  const shown = relative(config.base, file).split("\\").join("/");

  if (args["dry-run"]) {
    say(c.dim(`would write ${shown}`));
    say(content);
    return;
  }
  if (existsSync(file)) die(`${shown} already exists`);
  mkdirSync(join(config.docsDir, area), { recursive: true });
  writeFileSync(file, content);

  if (args.json) return emitJson({ id, path: shown, type, status });
  ok(c.dim(`${type} · ${area} · ${status}`));
  say(c.dim(`  Put "${config.trailer}: ${id}" in the commits that do this work —`));
  say(c.dim("  that is how `honestdocs index` learns which files it touched."));
  console.log(shown);
}
