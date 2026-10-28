// Small command-line plumbing shared by every command: arguments, colour, and the
// convention that diagnostics go to stderr so stdout stays parseable when a caller —
// a script, CI, an AI agent — pipes it.

export class UsageError extends Error {}
export class Failure extends Error {}

const useColour = () =>
  !process.env.NO_COLOR && (process.env.FORCE_COLOR || process.stderr.isTTY);

const paint = (code) => (s) => (useColour() ? `\x1b[${code}m${s}\x1b[0m` : String(s));

export const c = {
  dim: paint(2),
  red: paint(31),
  green: paint(32),
  yellow: paint(33),
};

export const say = (msg = "") => console.error(msg);
export const ok = (msg) => console.error(c.green("✓ ") + msg);
export const warn = (msg) => console.error(c.yellow("! ") + msg);

/** Stop with a message. A UsageError exits 2, anything else 1. */
export function die(msg) {
  throw new Failure(msg);
}

/**
 * Parse `argv` against a spec of flags.
 *
 *   parseArgs(argv, { title: "string", force: "boolean", "code-repo": "list" })
 *
 * Returns `{ _: [positional…], title, force, "code-repo": [...] }`. An unknown flag is a
 * UsageError rather than something silently ignored: a mistyped `--stauts` that does
 * nothing is worse than one that stops.
 */
export function parseArgs(argv, spec = {}) {
  const out = { _: [] };
  for (const [k, kind] of Object.entries(spec)) if (kind === "list") out[k] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--") {
      out._.push(...argv.slice(i + 1));
      break;
    }
    if (!a.startsWith("--") || a === "-") {
      out._.push(a);
      continue;
    }
    let [name, inline] = a.slice(2).split(/=(.*)/s, 2);
    const kind = spec[name];
    if (!kind) throw new UsageError(`unknown option --${name}`);
    if (kind === "boolean") {
      out[name] = inline === undefined ? true : !/^(false|0|no)$/i.test(inline);
      continue;
    }
    const value = inline ?? argv[++i];
    if (value === undefined) throw new UsageError(`--${name} needs a value`);
    if (kind === "list") out[name].push(value);
    else out[name] = value;
  }
  return out;
}

/** Print JSON on stdout — the one place a command writes data rather than talk. */
export const emitJson = (value) => console.log(JSON.stringify(value, null, 2));
