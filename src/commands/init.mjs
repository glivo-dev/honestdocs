import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { c, die, ok, parseArgs, say } from "../cli.mjs";
import { CONFIG_FILE, CONFIG_IN_ROOT, DEFAULT_AREAS, DEFAULT_ROOT, findConfig, loadConfig, runnerCommand } from "../config.mjs";
import { today } from "../docs.mjs";
import { stringify } from "../frontmatter.mjs";
import { fill, packageFile } from "../templates.mjs";
import { report, runIndex } from "./index.mjs";

export const summary = "set honestdocs up in this project";

export const help = `honestdocs init — ${summary}

  honestdocs init [--root <dir>] [--area <name[=description]>]… [--code-repo <path>]…
                  [--title <text>] [--agents] [--agents-file <file>] [--skill]

Creates ${DEFAULT_ROOT}/ with its config, a README, a first rule document
(rules/…-before-you-build.md) and INDEX.md. Refuses a folder that already
holds Markdown files — your own docs stay yours.

  --root <dir>          the documents folder (default: ${DEFAULT_ROOT}). With
                        any other folder the config goes to ${CONFIG_FILE}
                        at the top of the project instead.
  --area <name>         an area; repeat for more (default: general, rules).
                        "rules" is always added.
  --code-repo <path>    where commits carrying the trailer are read from
                        (default: "."). Repeat for several repositories, or
                        point at the parent when the documents are a separate
                        repository nested inside the code.
  --title <text>        the heading of INDEX.md
  --agents              add the honestdocs section to AGENTS.md (created if
                        missing; updated in place between markers on re-runs)
  --agents-file <file>  the same, into another file — CLAUDE.md, say
  --skill               install the agent skill at .claude/skills/honestdocs/

Run again in a project that is already set up, --agents and --skill refresh
those two and change nothing else.
`;

function hasMarkdown(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    if (entry.isDirectory() ? hasMarkdown(join(dir, entry.name)) : entry.name.endsWith(".md")) return true;
  }
  return false;
}

const START = "<!-- honestdocs:start -->";
const END = "<!-- honestdocs:end -->";

/** Insert or replace the marked block, leaving everything else in the file alone. */
function upsertBlock(file, block) {
  const wrapped = `${START}\n${block.trim()}\n${END}`;
  if (!existsSync(file)) {
    writeFileSync(file, wrapped + "\n");
    return "created";
  }
  const text = readFileSync(file, "utf8");
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a >= 0 && b > a) {
    const next = text.slice(0, a) + wrapped + text.slice(b + END.length);
    if (next === text) return "unchanged";
    writeFileSync(file, next);
    return "updated";
  }
  writeFileSync(file, text.replace(/\s*$/, "\n\n") + wrapped + "\n");
  return "appended";
}

/** What the guide texts are filled with: where the documents live, and how to run the tool. */
const guideValues = (config) => ({ root: config.root, trailer: config.trailer, command: config.command });

function installAgentBits(config, args) {
  const base = config.base;
  const values = guideValues(config);
  if (args.agents || args["agents-file"]) {
    const file = resolve(base, args["agents-file"] ?? "AGENTS.md");
    const how = upsertBlock(file, fill(packageFile("guide", "agents-snippet.md"), values));
    ok(`${relative(base, file)} — honestdocs section ${how}`);
  }
  if (args.skill) {
    const file = join(base, ".claude", "skills", "honestdocs", "SKILL.md");
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, fill(packageFile("guide", "skill", "SKILL.md"), values));
    ok(`${relative(base, file).split("\\").join("/")} — skill installed`);
  }
}

export function run(argv) {
  const args = parseArgs(argv, {
    root: "string", area: "list", "code-repo": "list", title: "string",
    agents: "boolean", "agents-file": "string", skill: "boolean",
  });
  const cwd = process.cwd();

  const existing = findConfig(cwd);
  if (existing) {
    const config = loadConfig(cwd);
    if (!args.agents && !args["agents-file"] && !args.skill) {
      die(`already set up: ${existing.file} — re-run with --agents or --skill to refresh those`);
    }
    installAgentBits(config, args);
    return;
  }

  const root = (args.root ?? DEFAULT_ROOT).replace(/[\\/]+$/, "").replace(/^\.[\\/]/, "");
  const target = resolve(cwd, root);
  if (existsSync(target) && hasMarkdown(target)) {
    die(`${root}/ already holds Markdown files — choose another folder with --root`);
  }
  const areas = {};
  for (const spec of args.area.length ? args.area : Object.keys(DEFAULT_AREAS)) {
    const [name, ...rest] = spec.split("=");
    areas[name.trim()] = rest.join("=").trim() || DEFAULT_AREAS[name.trim()] || "";
  }
  if (!areas.rules) areas.rules = DEFAULT_AREAS.rules;

  const raw = {
    root,
    title: args.title ?? "Development documents",
    areas,
    trailer: "Doc",
    command: runnerCommand(),
    codeRepos: args["code-repo"].length ? args["code-repo"] : ["."],
  };
  const configPath = root === DEFAULT_ROOT ? CONFIG_IN_ROOT : CONFIG_FILE;
  mkdirSync(dirname(join(cwd, configPath)), { recursive: true });
  writeFileSync(join(cwd, configPath), JSON.stringify(raw, null, 2) + "\n");
  ok(configPath);

  const config = loadConfig(cwd);
  mkdirSync(join(config.docsDir, "rules"), { recursive: true });

  const readme = join(config.docsDir, "README.md");
  if (!existsSync(readme)) {
    writeFileSync(readme, fill(packageFile("guide", "docs-readme.md"), guideValues(config)));
    ok(`${root}/README.md`);
  }

  const id = `${today()}-before-you-build`;
  const rulesFile = join(config.docsDir, "rules", `${id}.md`);
  const meta = {
    id,
    title: "Before you build: the checklist every change goes through",
    area: "rules",
    type: "rule",
    status: "current",
    created: today(),
    updated: today(),
    completed: "",
    progress: "",
    supersedes: [],
    "superseded-by": "",
    related: [],
    files: [],
  };
  writeFileSync(rulesFile, stringify(meta) + fill(packageFile("guide", "before-you-build.md"), guideValues(config)));
  ok(`${root}/rules/${id}.md`);

  installAgentBits(config, args);
  report(config, runIndex(config), false);

  say("");
  const area = Object.keys(config.areas).find((a) => a !== "rules") ?? "rules";
  const cmd = config.command;
  say("Next:");
  say(c.dim(`  start a document     ${cmd} new ${area} my-first-design --title "…"`));
  say(c.dim(`  link work to it      git commit -m "…" -m "${config.trailer}: <id>"`));
  say(c.dim(`  keep it honest       ${cmd} index && ${cmd} check`));
  if (!args.agents && !args["agents-file"]) say(c.dim(`  teach your agents    ${cmd} init --agents`));
}
