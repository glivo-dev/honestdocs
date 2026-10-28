import { UsageError, emitJson, parseArgs } from "../cli.mjs";
import { loadConfig } from "../config.mjs";
import { loadDocs } from "../docs.mjs";
import { MARK } from "../render.mjs";

export const summary = "find documents — including the superseded and abandoned ones";

export const help = `honestdocs search — ${summary}

  honestdocs search <words…> [--section <heading>] [--status <s>] [--area <a>]
                             [--type <t>] [--limit <n>] [--json]

Every word must appear in the document (case-insensitive). Results show the
matching lines under their section heading.

Search before proposing a design: if the idea was weighed and rejected, the
reason is in some document's "Alternatives considered".

  --section <heading>   only lines under headings containing this text,
                        e.g. --section alternatives
  --limit <n>           at most n documents (default 20)
`;

/** Split a body into `{ heading, line, text }` for each non-empty line. */
function linesWithHeadings(body) {
  const out = [];
  let heading = "";
  let inFence = false;
  body.split(/\r?\n/).forEach((text, i) => {
    if (/^\s*(```|~~~)/.test(text)) inFence = !inFence;
    const h = !inFence && /^#{1,6}\s+(.*)$/.exec(text);
    if (h) heading = h[1].trim();
    else if (text.trim()) out.push({ heading, line: i + 1, text: text.trim() });
  });
  return out;
}

export function search(config, words, opts = {}) {
  const terms = words.map((w) => w.toLowerCase()).filter(Boolean);
  const section = opts.section?.toLowerCase();
  const hits = [];
  for (const d of loadDocs(config)) {
    const m = d.meta;
    if (opts.status && m.status !== opts.status) continue;
    if (opts.area && m.area !== opts.area) continue;
    if (opts.type && m.type !== opts.type) continue;
    const lines = linesWithHeadings(d.body).filter((l) => !section || l.heading.toLowerCase().includes(section));
    const title = String(m.title ?? "").toLowerCase();
    const haystack = (section ? "" : title + "\n") + lines.map((l) => l.text.toLowerCase()).join("\n");
    if (!terms.every((t) => haystack.includes(t))) continue;
    const matching = lines.filter((l) => terms.some((t) => l.text.toLowerCase().includes(t)));
    const score = terms.filter((t) => title.includes(t)).length * 10 + matching.length;
    hits.push({
      id: d.id,
      path: `${config.root}/${d.rel}`,
      title: m.title ?? "",
      status: m.status ?? "",
      type: m.type ?? "",
      score,
      matches: matching.map((l) => ({ section: l.heading, line: l.line, text: l.text })),
    });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return hits;
}

export function run(argv) {
  const args = parseArgs(argv, {
    section: "string", status: "string", area: "string", type: "string", limit: "string", json: "boolean",
  });
  if (!args._.length) throw new UsageError("need at least one word to search for");
  const config = loadConfig();
  const limit = Number(args.limit ?? 20) || 20;
  const hits = search(config, args._, args).slice(0, limit);
  if (args.json) return emitJson(hits);
  if (!hits.length) return console.log("no document matches");
  const out = [];
  for (const h of hits) {
    const flag = h.status === "superseded" || h.status === "abandoned" || h.status === "retired" ? `  [${h.status.toUpperCase()}]` : "";
    out.push(`${MARK[h.status] ?? " "} ${h.path} — ${h.title}${flag}`);
    for (const m of h.matches.slice(0, 3)) {
      const text = m.text.length > 140 ? m.text.slice(0, 137) + "…" : m.text;
      out.push(`    ${m.section ? `§ ${m.section}: ` : ""}${text}`);
    }
    if (h.matches.length > 3) out.push(`    … ${h.matches.length - 3} more lines`);
  }
  console.log(out.join("\n"));
}
