import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRules } from "../src/rules.mjs";

test("reads numbered rules with their tests", () => {
  const rules = parseRules([
    "## Rules",
    "",
    "- **R1** Every route declares who may call it.",
    "  Test: `tests/routes.test.js`",
    "- **R2** Continued over",
    "  two lines.",
    "  Tests: `a.test.js`, `b.test.js`",
    "- **SEC10** Inline. Test: `tests/sec.test.js`",
    "",
    "Not a rule: **R9** in a paragraph.",
  ].join("\n"));
  assert.deepEqual(rules.map((r) => [r.id, r.text, r.tests]), [
    ["R1", "Every route declares who may call it.", ["tests/routes.test.js"]],
    ["R2", "Continued over two lines.", ["a.test.js", "b.test.js"]],
    ["SEC10", "Inline.", ["tests/sec.test.js"]],
  ]);
  assert.equal(rules[0].line, 3);
});

test("ignores rules inside code fences", () => {
  assert.deepEqual(parseRules("```\n- **R1** example\n```\n- **R2** real\n").map((r) => r.id), ["R2"]);
});

test("a `Test:` mentioned in the rule's own prose is not a test reference", () => {
  const [r] = parseRules("- **B3** A rule names its test on a `Test:` line, so check notices.\n");
  assert.deepEqual(r.tests, []);
  assert.match(r.text, /on a `Test:` line/);
});
