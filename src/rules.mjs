// Numbered rules inside `rule` documents.
//
// A rule is a list item that opens with its id in bold:
//
//   - **R3** Every route checks the item it names, not just the caller.
//     Test: `tests/routes/item-scope.test.ts`
//
// The id is letters then digits (R3, M12, SEC4). Lines indented under the item belong to
// it; a `Test:` or `Tests:` line names, in backticks, the files that prove it. A rule that
// can be a test should be one, and `check` fails when a named test does not exist — so
// "the test for this rule" cannot quietly become a file that was deleted last spring.

const RULE = /^(\s*)[-*]\s+\*\*([A-Z][A-Z0-9]*?\d+)\*\*[.:]?\s*(.*)$/;
const TEST = /^\s*Tests?:\s*(.+)$/i;
const FENCE = /^\s*(```|~~~)/;

export function parseRules(body) {
  const rules = [];
  let cur = null;
  let inFence = false;
  const lines = body.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (FENCE.test(line)) {
      inFence = !inFence;
      cur = null;
      continue;
    }
    if (inFence) continue;
    const m = RULE.exec(line);
    if (m) {
      cur = { id: m[2], text: m[3].trim(), tests: [], line: i + 1, indent: m[1].length };
      const inline = /^(.*?)\s+Tests?:\s*(`.+)$/i.exec(cur.text);
      if (inline) {
        cur.text = inline[1];
        for (const p of inline[2].matchAll(/`([^`]+)`/g)) cur.tests.push(p[1].trim());
      }
      rules.push(cur);
      continue;
    }
    if (!cur) continue;
    const indent = /^(\s*)/.exec(line)[1].length;
    if (line.trim() === "" || indent <= cur.indent) {
      cur = null;
      continue;
    }
    const t = TEST.exec(line);
    if (t) for (const p of t[1].matchAll(/`([^`]+)`/g)) cur.tests.push(p[1].trim());
    else cur.text += " " + line.trim();
  }
  return rules;
}
