#!/usr/bin/env node
// honestdocs — development documents that git keeps honest.

import { Failure, UsageError, c } from "../src/cli.mjs";
import { packageFile } from "../src/templates.mjs";

const COMMANDS = ["init", "new", "index", "check", "done", "status", "brief", "search", "rules", "promote", "guide"];

const load = (name) => import(`../src/commands/${name}.mjs`);

async function usage() {
  const lines = [
    "honestdocs — development documents that git keeps honest",
    "",
    "  honestdocs <command> [options]      honestdocs <command> --help for more",
    "",
  ];
  for (const name of COMMANDS) lines.push(`  ${name.padEnd(9)} ${(await load(name)).summary}`);
  lines.push("", "The method: honestdocs guide · Docs: https://github.com/glivo-dev/honestdocs");
  return lines.join("\n");
}

async function main(argv) {
  const [cmd, ...rest] = argv;
  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    console.log(await usage());
    if (!cmd) process.exitCode = 2;
    return;
  }
  if (cmd === "--version" || cmd === "-v") {
    console.log(JSON.parse(packageFile("package.json")).version);
    return;
  }
  if (!COMMANDS.includes(cmd)) throw new UsageError(`unknown command "${cmd}"`);
  const mod = await load(cmd);
  if (rest.includes("--help") || rest.includes("-h")) {
    console.log(mod.help.trimEnd());
    return;
  }
  await mod.run(rest);
}

main(process.argv.slice(2)).catch((e) => {
  if (e instanceof UsageError) {
    console.error(c.red("✗ ") + e.message);
    console.error(c.dim("  see: honestdocs " + (process.argv[2] && !process.argv[2].startsWith("-") ? process.argv[2] + " " : "") + "--help"));
    process.exitCode = 2;
  } else if (e instanceof Failure) {
    console.error(c.red("✗ ") + e.message);
    process.exitCode = 1;
  } else {
    console.error(e);
    process.exitCode = 1;
  }
});
