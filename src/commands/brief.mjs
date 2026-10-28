import { emitJson, parseArgs } from "../cli.mjs";
import { loadConfig } from "../config.mjs";
import { loadDocs, openItems } from "../docs.mjs";
import { MARK } from "../render.mjs";
import { parseRules } from "../rules.mjs";

export const summary = "what is under way, in a page — run it when a session starts";

export const help = `honestdocs brief — ${summary}

  honestdocs brief [--days <n>] [--json]

The work in progress with its next unticked items, what is planned, what changed
lately, and which rules are in force. Short on purpose: it is what a person back
from a week away, or an AI agent with an empty context, reads first.

  --days <n>   how far back "changed lately" reaches (default 14)
  --json       everything, unabridged, as JSON on stdout
`;

const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

function collectBrief(config, { days = 14 } = {}) {
  const docs = loadDocs(config).filter((d) => d.hasMeta);
  const pick = (d) => ({ id: d.id, path: `${config.root}/${d.rel}`, title: d.meta.title, type: d.meta.type, status: d.meta.status });
  const since = daysAgo(days);
  return {
    title: config.title,
    documents: docs.length,
    inProgress: docs.filter((d) => d.meta.status === "in-progress")
      .map((d) => ({ ...pick(d), progress: d.meta.progress || "", next: openItems(d.body) })),
    planned: docs.filter((d) => d.meta.status === "planned").map(pick),
    drafts: docs.filter((d) => d.meta.status === "draft" && String(d.meta.updated ?? "") >= since).map(pick),
    changed: docs.filter((d) => String(d.meta.updated ?? "") >= since)
      .sort((a, b) => String(b.meta.updated).localeCompare(String(a.meta.updated)))
      .map((d) => ({ ...pick(d), updated: d.meta.updated })),
    rules: docs.filter((d) => d.meta.type === "rule" && (d.meta.status === "current" || d.meta.status === "draft"))
      .map((d) => ({ ...pick(d), rules: parseRules(d.body).map((r) => r.id) })),
  };
}

const range = (ids) => (ids.length === 0 ? "no rules yet" : ids.length <= 3 ? ids.join(", ") : `${ids[0]}…${ids.at(-1)} (${ids.length})`);

export function run(argv) {
  const args = parseArgs(argv, { days: "string", json: "boolean" });
  const config = loadConfig();
  const b = collectBrief(config, { days: Number(args.days ?? 14) || 14 });
  if (args.json) return emitJson(b);

  const out = [`${b.title} — ${b.documents} documents`, ""];
  const line = (d, extra = "") => `  ${MARK[d.status] ?? " "} ${d.id} — ${d.title}${extra}`;

  out.push(b.inProgress.length ? "In progress" : "In progress: nothing");
  for (const d of b.inProgress.slice(0, 10)) {
    out.push(line(d, d.progress ? ` (${d.progress})` : ""));
    for (const item of d.next.slice(0, 3)) out.push(`      - [ ] ${item}`);
    if (d.next.length > 3) out.push(`      … ${d.next.length - 3} more`);
  }
  if (b.inProgress.length > 10) out.push(`  … ${b.inProgress.length - 10} more (--json for all)`);

  if (b.planned.length) {
    out.push("", "Planned — re-check against the code before building");
    for (const d of b.planned.slice(0, 8)) out.push(line(d));
    if (b.planned.length > 8) out.push(`  … ${b.planned.length - 8} more`);
  }

  const recent = b.changed.filter((d) => d.status !== "in-progress").slice(0, 8);
  if (recent.length) {
    out.push("", "Changed lately");
    for (const d of recent) out.push(line(d, `  · ${d.updated}`));
  }

  if (b.rules.length) {
    out.push("", "Rules in force — read the ones a change touches before building");
    for (const d of b.rules) out.push(`  ${d.path} — ${d.title}: ${range(d.rules)}`);
  }
  console.log(out.join("\n"));
}
