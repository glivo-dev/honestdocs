// Finding and reading honestdocs.config.json.
//
// The config is found by walking up from the working directory, the way git finds .git,
// so every command works from anywhere inside the project. Everything a project may want
// to differ on — areas, the docs folder, the trailer word, where the code lives — is here;
// the lifecycles are not, because the checks only mean something if "done" and "current"
// mean the same thing in every project that uses this.

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { Failure } from "./cli.mjs";

/** The default home: documents and config together, out of the way of the project's own folders. */
export const DEFAULT_ROOT = ".honestdocs";
export const CONFIG_IN_ROOT = `${DEFAULT_ROOT}/config.json`;
/** For a project that keeps its documents somewhere else, the config sits at the top. */
export const CONFIG_FILE = "honestdocs.config.json";

/**
 * Two kinds of document, with two lifecycles.
 *
 * Work documents describe something that gets done and then is finished: they move
 * towards `done` or `abandoned`. Living documents — references and rules — are never
 * finished; they are true now and edited in place, so they are `current` until retired.
 * Forcing a standing rule through "draft → in-progress → done" leaves it in `draft`
 * forever while everyone follows it, which is its own kind of lie.
 */
export const LIFECYCLES = {
  work: {
    draft: "Being written; not ready to build from",
    planned: "Decided and written down, but no code yet — re-check it against reality before building",
    "in-progress": "Decided, and the work is under way",
    done: "Finished and shipped",
    superseded: "A newer document replaced this one — do not build from it",
    abandoned: "Deliberately not done; kept so the reasoning survives",
  },
  living: {
    draft: "Being written; not in force yet",
    current: "In force: true today, kept true in place",
    retired: "No longer in force; kept so the reasoning survives",
    superseded: "A newer document replaced this one — follow that one instead",
  },
};

const DEFAULT_TYPES = {
  research: { lifecycle: "work", description: "A question and what was found out, with sources" },
  design: { lifecycle: "work", description: "How something should work, decided before building it" },
  plan: { lifecycle: "work", description: "A sequence of work with a checklist that drives progress" },
  decision: { lifecycle: "work", description: "One choice, its context and its consequences (MADR)" },
  postmortem: { lifecycle: "work", description: "Something went wrong: timeline, impact, root cause, what changed" },
  reference: { lifecycle: "living", description: "Background that stays true: a protocol, an API, a guide" },
  rule: { lifecycle: "living", description: "Numbered rules every change must keep, each naming its test where it can" },
};

export const DEFAULT_AREAS = {
  general: "Anything that does not belong to a narrower area yet",
  rules: "Standing rules every change must keep — read before building, updated in place",
};

/**
 * Walk up from `start` to the nearest project: a folder holding `.honestdocs/config.json`
 * or `honestdocs.config.json`. Returns `{ file, base }` — `base` is the project folder,
 * which every relative path in the config is read against — or null.
 */
export function findConfig(start = process.cwd()) {
  let dir = resolve(start);
  for (;;) {
    const found = [join(dir, CONFIG_IN_ROOT), join(dir, CONFIG_FILE)].filter((f) => existsSync(f));
    if (found.length > 1) {
      throw new Failure(`two configs in ${dir}: ${CONFIG_IN_ROOT} and ${CONFIG_FILE} — keep one`);
    }
    if (found.length) return { file: found[0], base: dir };
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Load and validate the config. Returns a normalised object with absolute paths, so no
 * command ever has to think about where it was started from.
 */
export function loadConfig(start = process.cwd()) {
  const found = findConfig(start);
  if (!found) throw new Failure(`no ${CONFIG_IN_ROOT} here or above — run \`honestdocs init\` first`);
  let raw;
  try {
    raw = JSON.parse(readFileSync(found.file, "utf8"));
  } catch (e) {
    throw new Failure(`${found.file} is not valid JSON: ${e.message}`);
  }
  return normalise(raw, found.base, found.file);
}

function normalise(raw, base, file = join(base, CONFIG_FILE)) {
  const problems = [];
  const root = typeof raw.root === "string" && raw.root ? raw.root : DEFAULT_ROOT;

  const areas = raw.areas && typeof raw.areas === "object" ? raw.areas : DEFAULT_AREAS;
  if (!Object.keys(areas).length) problems.push("`areas` is empty — a document needs somewhere to live");
  for (const a of Object.keys(areas)) {
    if (!/^[a-z0-9_][a-z0-9_-]*$/.test(a)) problems.push(`area "${a}" must be lower-case letters, digits, - or _`);
  }

  const types = { ...DEFAULT_TYPES };
  for (const [name, def] of Object.entries(raw.types ?? {})) {
    if (def === false || def === null) {
      delete types[name];
      continue;
    }
    const lifecycle = def?.lifecycle ?? types[name]?.lifecycle;
    if (!LIFECYCLES[lifecycle]) {
      problems.push(`type "${name}" needs a lifecycle: ${Object.keys(LIFECYCLES).join(" or ")}`);
      continue;
    }
    types[name] = { lifecycle, description: def?.description ?? types[name]?.description ?? "" };
  }

  const trailer = typeof raw.trailer === "string" && raw.trailer ? raw.trailer : "Doc";
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(trailer)) problems.push(`trailer "${trailer}" must be a git trailer key such as Doc`);

  const codeRepos = (Array.isArray(raw.codeRepos) && raw.codeRepos.length ? raw.codeRepos : ["."])
    .map((p) => (isAbsolute(p) ? p : resolve(base, p)));

  if (problems.length) throw new Failure(`${file}:\n  ${problems.join("\n  ")}`);

  return {
    file,
    base,
    root,
    docsDir: resolve(base, root),
    title: typeof raw.title === "string" && raw.title ? raw.title : "Development documents",
    areas,
    types,
    trailer,
    codeRepos,
    templatesDir: raw.templates ? resolve(base, raw.templates) : null,
    recent: Number.isInteger(raw.recent) && raw.recent > 0 ? raw.recent : 25,
    raw,
  };
}

/** The statuses a document of this type may have. */
export const statusesFor = (config, type) => LIFECYCLES[config.types[type]?.lifecycle] ?? null;

export const lifecycleOf = (config, type) => config.types[type]?.lifecycle ?? null;
