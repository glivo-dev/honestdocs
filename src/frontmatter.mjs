// Frontmatter: a deliberately small YAML subset — `key: scalar` and `key: [a, b]`,
// nothing nested.
//
// Documents are read and rewritten by these scripts far more often than a full YAML
// parser would earn its keep, and a strict, flat shape is what lets `check` say something
// precise. Anything a real YAML parser would read differently is quoted on the way out.

const FM = /^﻿?---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

const unquote = (v) => {
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  return v;
};

/** Split `[a, "b, c", d]` into items, honouring quotes. */
function splitList(inner) {
  const items = [];
  let cur = "";
  let quote = null;
  for (const ch of inner) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      cur += ch;
      quote = ch;
    } else if (ch === ",") {
      items.push(cur);
      cur = "";
    } else cur += ch;
  }
  items.push(cur);
  return items.map((s) => unquote(s.trim())).filter((s) => s !== "");
}

/** `{ meta, body }`; `meta` is null when the file has no frontmatter block at all. */
export function parse(raw) {
  const m = FM.exec(raw);
  if (!m) return { meta: null, body: raw.replace(/^﻿/, "") };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([A-Za-z][\w-]*):[ \t]*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, rest] = kv;
    const v = rest.trim();
    if (v === "") meta[key] = "";
    else if (v.startsWith("[") && v.endsWith("]")) meta[key] = splitList(v.slice(1, -1));
    else if (v === "true" || v === "false") meta[key] = v === "true";
    else meta[key] = unquote(v);
  }
  return { meta, body: raw.slice(m[0].length) };
}

const KEY_ORDER = [
  "id", "title", "area", "type", "status", "legacy",
  "created", "updated", "completed", "progress",
  "supersedes", "superseded-by", "related", "files",
];

// A plain scalar that a YAML parser would read as something else — structure, a comment,
// a number, a boolean — or that carries leading/trailing space, gets quoted.
const NEEDS_QUOTES = /^[\s[\]{}>|*&!%@`#'",?:-]|[\s:]$|: | #|^(true|false|yes|no|null|~)$|^[\d.+-]+$/i;

const scalar = (v) => {
  const s = String(v);
  return NEEDS_QUOTES.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s) ? JSON.stringify(s) : s;
};
const listItem = (v) => {
  const s = String(v);
  return /[,[\]"']|^\s|\s$/.test(s) ? JSON.stringify(s) : s;
};

export function stringify(meta) {
  const keys = [...KEY_ORDER.filter((k) => k in meta), ...Object.keys(meta).filter((k) => !KEY_ORDER.includes(k))];
  const lines = keys.map((k) => {
    const v = meta[k];
    if (Array.isArray(v)) return `${k}: [${v.map(listItem).join(", ")}]`;
    if (v === undefined || v === null || v === "") return `${k}:`;
    if (typeof v === "boolean" || typeof v === "number") return `${k}: ${v}`;
    return `${k}: ${scalar(v)}`;
  });
  return `---\n${lines.join("\n")}\n---\n`;
}
