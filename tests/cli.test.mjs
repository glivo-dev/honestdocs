import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { parse } from "../src/frontmatter.mjs";
import { config, doc, project } from "./_helpers.mjs";

let p;
afterEach(() => p?.cleanup());

const meta = (rel) => parse(p.read(rel)).meta;
const errors = (r) => r.json().errors.map((e) => e.msg).join("\n");

describe("init", () => {
  test("sets a project up so that check passes straight away", () => {
    p = project();
    const r = p.run(["init", "--agents", "--skill"]);
    assert.equal(r.code, 0, r.stderr);
    for (const f of ["honestdocs.config.json", "devdocs/README.md", "devdocs/INDEX.md", "AGENTS.md", ".claude/skills/honestdocs/SKILL.md"]) {
      assert.ok(existsSync(join(p.dir, f)), f);
    }
    const rules = readdirSync(join(p.dir, "devdocs/rules"));
    assert.equal(rules.length, 1);
    assert.match(rules[0], /^\d{4}-\d{2}-\d{2}-before-you-build\.md$/);
    const c = p.run(["check", "--json"]);
    assert.equal(c.code, 0, c.stdout);
  });

  test("refuses to run twice, but refreshes the agents block in place", () => {
    p = project();
    p.write("AGENTS.md", "# Mine\n\nKeep this.\n");
    p.run(["init", "--agents"]);
    assert.equal(p.run(["init"]).code, 1);
    const first = p.read("AGENTS.md");
    assert.match(first, /^# Mine\n\nKeep this\.\n\n<!-- honestdocs:start -->/);
    assert.equal(p.run(["init", "--agents"]).code, 0);
    assert.equal(p.read("AGENTS.md"), first);
  });
});

describe("new", () => {
  test("writes the document and prints its path", () => {
    p = project();
    config(p);
    const r = p.run(["new", "general", "Token Rotation!", "--type", "plan", "--title", "Token rotation"]);
    assert.equal(r.code, 0, r.stderr);
    const path = r.stdout.trim();
    assert.match(path, /^devdocs\/general\/\d{4}-\d{2}-\d{2}-token-rotation\.md$/);
    const m = meta(path);
    assert.equal(m.type, "plan");
    assert.equal(m.status, "draft");
    assert.equal(m.title, "Token rotation");
    assert.match(p.read(path), /## Alternatives considered/);
  });

  test("refuses unknown areas, missing titles and statuses the type does not have", () => {
    p = project();
    config(p);
    assert.equal(p.run(["new", "nowhere", "x", "--title", "X"]).code, 1);
    assert.equal(p.run(["new", "general", "x"]).code, 2);
    assert.equal(p.run(["new", "general", "x", "--title", "X", "--status", "current"]).code, 1);
    assert.equal(p.run(["new", "rules", "x", "--type", "rule", "--title", "X", "--status", "current"]).code, 0);
    assert.equal(p.run(["new", "rules", "x", "--type", "rule", "--title", "X"]).code, 1, "same id twice");
  });

  test("uses a project's own template when it has one", () => {
    p = project();
    config(p, { templates: "devdocs/_templates" });
    p.write("devdocs/_templates/design.md", "# {{title}}\n\nOUR TEMPLATE\n");
    const r = p.run(["new", "general", "x", "--title", "X"]);
    assert.match(p.read(r.stdout.trim()), /OUR TEMPLATE/);
    p.run(["index"]);
    assert.doesNotMatch(p.read("devdocs/INDEX.md"), /_templates/);
  });
});

describe("index", () => {
  test("derives files from commit trailers, matching whole ids only", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-auth");
    doc(p, "general", "2026-01-01-auth-tokens");
    p.commit("docs");
    p.write("src/a.js", "a");
    p.commit("feat: a\n\nDoc: 2026-01-01-auth");
    p.write("src/b.js", "b");
    p.write("devdocs/general/2026-01-01-auth-tokens.md", p.read("devdocs/general/2026-01-01-auth-tokens.md") + "more\n");
    p.commit("feat: b\n\ndoc: 2026-01-01-auth-tokens, 2026-01-01-auth");
    p.write("src/c.js", "c");
    p.commit("feat: c — mentions Doc: 2026-01-01-auth mid-line, which is not a trailer");

    assert.equal(p.run(["index"]).code, 0);
    assert.deepEqual(meta("devdocs/general/2026-01-01-auth.md").files, ["src/b.js", "src/a.js"]);
    // The documents folder itself is never listed as work done.
    assert.deepEqual(meta("devdocs/general/2026-01-01-auth-tokens.md").files, ["src/b.js"]);
  });

  test("run from a Windows short (8.3) path, the documents folder is still left out", { skip: process.platform !== "win32" }, () => {
    p = project();
    config(p);
    p.commit("setup");
    doc(p, "general", "2026-01-01-a");
    p.write("src/a.js", "a");
    p.commit("work\n\nDoc: 2026-01-01-a");
    const short = execFileSync("cmd", ["/c", `for %I in ("${p.dir}") do @echo %~sI`], {
      encoding: "utf8",
      windowsVerbatimArguments: true,
    }).trim();
    if (short.toLowerCase() === p.dir.toLowerCase()) return; // 8.3 names are off on this volume
    assert.equal(p.run(["index"], short).code, 0);
    assert.deepEqual(meta("devdocs/general/2026-01-01-a.md").files, ["src/a.js"]);
  });

  test("counts the checklist and marks a replaced document", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-old", { status: "in-progress" });
    doc(p, "general", "2026-02-01-new", { type: "plan", extra: "supersedes: [2026-01-01-old]", body: "- [x] one\n- [ ] two\n" });
    p.run(["index"]);
    assert.equal(meta("devdocs/general/2026-02-01-new.md").progress, "1/2");
    const old = meta("devdocs/general/2026-01-01-old.md");
    assert.equal(old.status, "superseded");
    assert.equal(old["superseded-by"], "2026-02-01-new");
    assert.match(p.read("devdocs/INDEX.md"), /🗑️ \| \[2026-01-01-old\]/);
  });

  test("updated comes from the last content change, not a rename", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a");
    p.commit("add", { date: "2026-03-01T12:00:00" });
    p.git(["mv", "devdocs/general/2026-01-01-a.md", "devdocs/general/2026-01-01-b.md"]);
    p.commit("rename", { date: "2026-04-01T12:00:00" });
    p.git(["mv", "devdocs/general/2026-01-01-b.md", "devdocs/general/2026-01-01-a.md"]);
    p.commit("rename back", { date: "2026-05-01T12:00:00" });
    p.run(["index"]);
    assert.equal(meta("devdocs/general/2026-01-01-a.md").updated, "2026-03-01");
  });

  test("outside git it still indexes, and says what it could not derive", () => {
    p = project({ git: false });
    config(p);
    doc(p, "general", "2026-01-01-a", { body: "- [ ] x\n" });
    const r = p.run(["index"]);
    assert.equal(r.code, 0);
    assert.match(r.stderr, /not a git repository/);
    assert.equal(meta("devdocs/general/2026-01-01-a.md").progress, "0/1");
  });

  test("is stable: a second run changes nothing", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a", { body: "- [ ] x\n" });
    p.run(["index"]);
    p.commit("docs");
    p.run(["index"]);
    const r = p.run(["index", "--json"]);
    assert.deepEqual(r.json().changed, []);
    assert.equal(r.json().index, "unchanged");
  });
});

describe("check", () => {
  test("rejects what makes the set lie", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a", { status: "current" });
    doc(p, "general", "2026-01-01-b", { extra: "supersedes: [nope]\nrelated: [missing, docs/missing.md]" });
    p.write("devdocs/general/2026-01-01-c.md", "---\nid: wrong\ntitle: C\narea: rules\ntype: design\nstatus: draft\n---\n");
    p.write("devdocs/general/no-frontmatter.md", "# hi\n");
    const r = p.run(["check", "--json"]);
    assert.equal(r.code, 1);
    const all = errors(r);
    assert.match(all, /"current" is not a status for a design/);
    assert.match(all, /supersedes "nope"/);
    assert.match(all, /related "missing"/);
    assert.match(all, /related "docs\/missing\.md"/);
    assert.match(all, /does not match the filename/);
    assert.match(all, /lives in general\//);
    assert.match(all, /no frontmatter/);
    assert.match(all, /INDEX\.md|missing — run/);
  });

  test("a stale checklist count or index is an error until index runs", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a", { body: "- [ ] x\n" });
    p.run(["index"]);
    assert.equal(p.run(["check"]).code, 0);
    p.write("devdocs/general/2026-01-01-a.md", p.read("devdocs/general/2026-01-01-a.md").replace("- [ ] x", "- [x] x"));
    const r = p.run(["check", "--json"]);
    assert.equal(r.code, 1);
    assert.match(errors(r), /`progress` is "0\/1", should be "1\/1"/);
    p.run(["index"]);
    assert.equal(p.run(["check"]).code, 0);
  });

  test("a new commit naming a document is a warning, not an error", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a");
    p.run(["index"]);
    p.commit("docs");
    p.write("src/x.js", "x");
    p.commit("work\n\nDoc: 2026-01-01-a");
    const r = p.run(["check", "--json"]);
    assert.equal(r.code, 0, r.stdout);
    assert.match(r.json().warnings.map((w) => w.msg).join("\n"), /`files`/);
  });

  test("a superseded document that still claims to be in force fails", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-old", { status: "done" });
    p.run(["index"]);
    doc(p, "general", "2026-02-01-new", { extra: "supersedes: [2026-01-01-old]" });
    const r = p.run(["check", "--json"]);
    assert.equal(r.code, 1);
    assert.match(errors(r), /replaced by 2026-02-01-new but still says "done"/);
  });

  test("rules must name tests that exist, and ids must be unique", () => {
    p = project();
    config(p);
    p.write("tests/real.test.js", "");
    doc(p, "rules", "2026-01-01-r", {
      type: "rule", status: "current",
      body: "- **R1** ok\n  Test: `tests/real.test.js`\n- **R2** gone\n  Test: `tests/gone.test.js`\n",
    });
    doc(p, "rules", "2026-01-01-s", { type: "rule", status: "current", body: "- **R1** again\n" });
    p.run(["index"]);
    const r = p.run(["check", "--json"]);
    assert.equal(r.code, 1);
    const all = errors(r);
    assert.match(all, /rule R2 names the test `tests\/gone\.test\.js`/);
    assert.match(all, /rule R1 is also defined/);
    assert.doesNotMatch(all, /real\.test\.js/);
  });

  test("--fix moves the area to match the folder", () => {
    p = project();
    config(p);
    p.write("devdocs/rules/2026-01-01-a.md", "---\nid: 2026-01-01-a\ntitle: A\narea: general\ntype: design\nstatus: draft\n---\n");
    p.run(["check", "--fix"]);
    assert.equal(meta("devdocs/rules/2026-01-01-a.md").area, "rules");
  });
});

describe("done and status", () => {
  test("done refuses an unfinished checklist unless forced", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a", { type: "plan", status: "in-progress", body: "- [x] a\n- [ ] b\n" });
    assert.equal(p.run(["done", "2026-01-01-a"]).code, 1);
    assert.equal(meta("devdocs/general/2026-01-01-a.md").status, "in-progress");
    assert.equal(p.run(["done", "2026-01-01-a", "--force"]).code, 0);
    const m = meta("devdocs/general/2026-01-01-a.md");
    assert.equal(m.status, "done");
    assert.match(m.completed, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(m.progress, "1/2");
  });

  test("abandoning needs no ticked boxes", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-a", { type: "plan", body: "- [ ] never\n" });
    assert.equal(p.run(["done", "2026-01-01-a", "--abandoned"]).code, 0);
    assert.equal(meta("devdocs/general/2026-01-01-a.md").status, "abandoned");
  });

  test("living documents are never done; they are current or retired", () => {
    p = project();
    config(p);
    doc(p, "rules", "2026-01-01-r", { type: "rule", body: "- **R1** x\n" });
    assert.equal(p.run(["done", "2026-01-01-r"]).code, 1);
    assert.equal(p.run(["status", "2026-01-01-r", "current"]).code, 0);
    assert.equal(meta("devdocs/rules/2026-01-01-r.md").status, "current");
    assert.equal(p.run(["status", "2026-01-01-r", "superseded"]).code, 1);
    assert.equal(p.run(["status", "2026-01-01-r", "in-progress"]).code, 1);
  });
});

describe("queries", () => {
  test("brief, search and rules answer in JSON", () => {
    p = project();
    config(p);
    doc(p, "general", "2026-01-01-cache", {
      type: "plan", status: "in-progress", title: "Response cache",
      body: "## Alternatives considered\n\nRedis was rejected: one more service to run.\n\n## Checklist\n\n- [x] measure\n- [ ] build\n",
    });
    doc(p, "general", "2025-06-01-old-cache", { status: "abandoned", title: "Old cache idea", body: "## Design\n\nUse Redis everywhere.\n" });
    doc(p, "rules", "2026-01-01-r", { type: "rule", status: "current", body: "- **R1** Cache keys include the tenant.\n" });
    p.run(["index"]);

    const b = p.run(["brief", "--json"]).json();
    assert.deepEqual(b.inProgress.map((d) => [d.id, d.progress, d.next]), [["2026-01-01-cache", "1/2", ["build"]]]);
    assert.deepEqual(b.rules[0].rules, ["R1"]);

    const all = p.run(["search", "redis", "--json"]).json();
    assert.deepEqual(all.map((h) => h.id).sort(), ["2025-06-01-old-cache", "2026-01-01-cache"]);
    const rejected = p.run(["search", "redis", "--section", "alternatives", "--json"]).json();
    assert.deepEqual(rejected.map((h) => [h.id, h.matches[0].section]), [["2026-01-01-cache", "Alternatives considered"]]);

    const rules = p.run(["rules", "--json"]).json();
    assert.equal(rules[0].rules[0].text, "Cache keys include the tenant.");

    const text = p.run(["brief"]);
    assert.match(text.stdout, /In progress\n.*2026-01-01-cache — Response cache \(1\/2\)\n\s+- \[ \] build/);
  });
});

describe("layouts", () => {
  test("documents in their own repository nested inside the code", () => {
    p = project();
    config(p, { root: ".devdocs" });
    p.write(".gitignore", ".devdocs/\n");
    p.write("src/app.js", "x");
    p.commit("init");
    const docs = join(p.dir, ".devdocs");
    p.write(".devdocs/general/2026-01-01-a.md", "---\nid: 2026-01-01-a\ntitle: A\narea: general\ntype: design\nstatus: draft\n---\n");
    p.git(["init", "-q", "-b", "main"], docs);
    p.commit("doc", { cwd: docs, date: "2026-02-02T10:00:00" });
    p.write("src/app.js", "y");
    p.commit("work\n\nDoc: 2026-01-01-a");

    assert.equal(p.run(["index"]).code, 0);
    const m = meta(".devdocs/general/2026-01-01-a.md");
    assert.deepEqual(m.files, ["src/app.js"]);
    assert.equal(m.updated, "2026-02-02");
  });

  test("several code repositories prefix each file with its repository", () => {
    p = project({ git: false });
    config(p, { codeRepos: ["app", "web"] });
    for (const repo of ["app", "web"]) {
      p.write(`${repo}/index.js`, repo);
      p.git(["init", "-q", "-b", "main"], join(p.dir, repo));
      p.commit("work\n\nDoc: 2026-01-01-a", { cwd: join(p.dir, repo) });
    }
    p.git(["init", "-q", "-b", "main"]);
    doc(p, "general", "2026-01-01-a");
    p.commit("docs");
    p.run(["index"]);
    assert.deepEqual(meta("devdocs/general/2026-01-01-a.md").files.sort(), ["app/index.js", "web/index.js"]);
  });
});

describe("the command line", () => {
  test("unknown commands and options are usage errors", () => {
    p = project();
    config(p);
    assert.equal(p.run(["nope"]).code, 2);
    assert.equal(p.run(["index", "--stauts"]).code, 2);
    assert.equal(p.run(["index", "--help"]).code, 0);
    assert.match(p.run(["--version"]).stdout, /^\d+\.\d+\.\d+/);
  });

  test("works from a subfolder of the project", () => {
    p = project();
    config(p);
    p.write("src/deep/x.js", "");
    const r = p.run(["new", "general", "x", "--title", "X"], join(p.dir, "src/deep"));
    assert.equal(r.code, 0, r.stderr);
  });
});
