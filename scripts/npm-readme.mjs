#!/usr/bin/env node
// The README's images come in a light and a dark variant, chosen on GitHub by the
// `#gh-light-mode-only` / `#gh-dark-mode-only` fragments its page stylesheet hides. npm's
// package page has one, light, theme and ignores the fragments, so it shows both. While
// the package is packed, README.md is rewritten to the light images alone; `restore` puts
// the GitHub version back.
//
//   node scripts/npm-readme.mjs pack      (prepack)
//   node scripts/npm-readme.mjs restore   (postpack)

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const README = join(ROOT, "README.md");
const KEPT = join(ROOT, ".README.github.md");

export const forNpm = (text) =>
  text
    .split("\n")
    .filter((line) => !line.includes("#gh-dark-mode-only"))
    .join("\n")
    .replaceAll("#gh-light-mode-only", "");

const mode = process.argv[2];
if (mode === "pack") {
  // A leftover copy means an earlier pack stopped half way: README.md is the npm version.
  if (existsSync(KEPT)) throw new Error(`${KEPT} exists — run "node scripts/npm-readme.mjs restore" first`);
  const text = readFileSync(README, "utf8");
  renameSync(README, KEPT);
  writeFileSync(README, forNpm(text));
} else if (mode === "restore") {
  if (existsSync(KEPT)) renameSync(KEPT, README);
} else if (mode) {
  throw new Error(`unknown mode "${mode}" — pack or restore`);
}
