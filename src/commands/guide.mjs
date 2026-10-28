import { UsageError, parseArgs } from "../cli.mjs";
import { DEFAULT_ROOT, findConfig, loadConfig, runnerCommand } from "../config.mjs";
import { fill, packageFile } from "../templates.mjs";

export const summary = "print the method, the agent instructions or the skill";

const TOPICS = {
  method: ["METHOD.md"],
  agents: ["agents-snippet.md"],
  skill: ["skill", "SKILL.md"],
};

export const help = `honestdocs guide — ${summary}

  honestdocs guide [method|agents|skill]

  method   the rules of the method itself (default)
  agents   the section \`init --agents\` writes into AGENTS.md
  skill    the agent skill \`init --skill\` installs
`;

export function run(argv) {
  const args = parseArgs(argv, {});
  const topic = args._[0] ?? "method";
  if (!TOPICS[topic]) throw new UsageError(`unknown topic "${topic}" — expected: ${Object.keys(TOPICS).join(", ")}`);
  const config = findConfig() ? loadConfig() : null;
  const values = {
    root: config?.root ?? DEFAULT_ROOT,
    trailer: config?.trailer ?? "Doc",
    command: config?.command ?? runnerCommand(),
  };
  console.log(fill(packageFile("guide", ...TOPICS[topic]), values).trimEnd());
}
