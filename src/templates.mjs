// Body templates for new documents. A project can override any of them by putting
// `<type>.md` in the folder its config names under `templates`; the rest fall back to the
// ones shipped here.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BUILT_IN = join(PACKAGE_ROOT, "templates");

export function templateFor(config, type) {
  for (const dir of [config.templatesDir, BUILT_IN]) {
    if (!dir) continue;
    const file = join(dir, `${type}.md`);
    if (existsSync(file)) return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  }
  return "# {{title}}\n\n## Log\n";
}

export function fill(template, values) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (k in values ? String(values[k]) : m));
}

/** A file shipped with the package (guides, the agents snippet, the skill). */
export const packageFile = (...parts) => readFileSync(join(PACKAGE_ROOT, ...parts), "utf8").replace(/\r\n/g, "\n");
