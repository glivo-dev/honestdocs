#!/usr/bin/env node
// The README's images come in a light and a dark variant, chosen on GitHub by the
// `#gh-light-mode-only` / `#gh-dark-mode-only` fragments its page stylesheet hides. npm's
// package page has one, light, theme and ignores the fragments, so it shows both. While
// the package is published, README.md is rewritten to the light images alone; `restore`
// puts the GitHub version back.
//
// The page does not show the README in the tarball but the one npm reads from disk after
// packing, just before upload — so the rewrite spans prepublishOnly to postpublish. A
// prepack/postpack pair fixes the tarball and leaves the page showing both (0.1.1 did).
//
//   node scripts/npm-readme.mjs pack      (prepublishOnly)
//   node scripts/npm-readme.mjs restore   (postpublish; also by hand after a failed publish)

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
