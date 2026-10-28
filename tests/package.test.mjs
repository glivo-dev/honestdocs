import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { BIN } from "./_helpers.mjs";

const pkg = JSON.parse(readFileSync(join(BIN, "..", "..", "package.json"), "utf8"));
const COMMANDS = ["init", "new", "index", "check", "done", "status", "brief", "search", "rules", "promote", "guide"];
const cli = (args) => spawnSync(process.execPath, [BIN, ...args], { encoding: "utf8", env: { ...process.env, NO_COLOR: "1" } });

test("H1: no runtime dependencies", () => {
  assert.deepEqual(Object.keys(pkg.dependencies ?? {}), []);
  assert.deepEqual(Object.keys(pkg.peerDependencies ?? {}), []);
});

test("H2: every command answers --help and is listed in the overview", () => {
  const overview = cli(["--help"]).stdout;
  for (const cmd of COMMANDS) {
    const r = cli([cmd, "--help"]);
    assert.equal(r.status, 0, cmd);
    assert.match(r.stdout, new RegExp(`honestdocs ${cmd}`), cmd);
    assert.match(overview, new RegExp(`^  ${cmd} `, "m"), cmd);
  }
});

test("H2: an unknown option is a usage error, not ignored", () => {
  for (const cmd of ["index", "check", "brief", "rules"]) assert.equal(cli([cmd, "--no-such-flag"]).status, 2, cmd);
});

test("the published package carries the files the CLI reads at run time", () => {
  for (const dir of ["bin/", "src/", "templates/", "guide/"]) assert.ok(pkg.files.includes(dir), dir);
});
