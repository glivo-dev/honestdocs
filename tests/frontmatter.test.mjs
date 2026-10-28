import assert from "node:assert/strict";
import { test } from "node:test";
import { parse, stringify } from "../src/frontmatter.mjs";

test("reads scalars, lists and booleans", () => {
  const { meta, body } = parse("---\nid: a\ntitle: Hello\nlegacy: true\nrelated: [x, y]\nfiles: []\nempty:\n---\n# Body\n");
  assert.deepEqual(meta, { id: "a", title: "Hello", legacy: true, related: ["x", "y"], files: [], empty: "" });
  assert.equal(body, "# Body\n");
});

test("no frontmatter gives null meta and the whole text as body", () => {
  assert.deepEqual(parse("# Just text\n"), { meta: null, body: "# Just text\n" });
});

test("tolerates a BOM and CRLF line endings", () => {
  const { meta, body } = parse("﻿---\r\nid: a\r\ntitle: T\r\n---\r\nbody\r\n");
  assert.equal(meta.id, "a");
  assert.equal(meta.title, "T");
  assert.equal(body, "body\r\n");
});

test("titles that YAML would misread are quoted, and read back unchanged", () => {
  for (const title of ["Before you build: the checklist", "#1 priority", "- dash first", "true", "3.14", "it's [fine]", "中文标题：说明"]) {
    const out = stringify({ id: "x", title });
    assert.equal(parse(out + "body").meta.title, title, out);
  }
});

test("dates and plain words stay unquoted", () => {
  const out = stringify({ id: "2026-01-01-a", status: "in-progress", created: "2026-01-01", progress: "3/5" });
  assert.match(out, /^id: 2026-01-01-a$/m);
  assert.match(out, /^status: in-progress$/m);
  assert.match(out, /^created: 2026-01-01$/m);
  assert.match(out, /^progress: 3\/5$/m);
});

test("list items with commas survive a round trip", () => {
  const meta = { id: "x", related: ["a, b", "plain", "docs/x.md"] };
  assert.deepEqual(parse(stringify(meta)).meta.related, meta.related);
});

test("keys come out in the canonical order, unknown keys last", () => {
  const out = stringify({ custom: "1", files: [], id: "x", title: "t", status: "draft" });
  assert.deepEqual(out.split("\n").slice(1, -2).map((l) => l.split(":")[0]), ["id", "title", "status", "files", "custom"]);
});

test("a value with a trailing comment is kept whole, so check can reject it", () => {
  assert.equal(parse("---\nstatus: draft   # draft | done\n---\n").meta.status, "draft   # draft | done");
});
