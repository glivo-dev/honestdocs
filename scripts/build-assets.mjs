#!/usr/bin/env node
// Regenerates the images in assets/ — the mark, the logo and the README diagram — in a
// light and a dark variant from one definition, so the two can never disagree. mark.svg is
// the square icon on its own, for an avatar or a package page; the README does not use it.
//
//   node scripts/build-assets.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets");

const THEMES = {
  light: { ink: "#1f2328", muted: "#59636e", line: "#d1d9e0", card: "#ffffff", accent: "#16a34a" },
  dark: { ink: "#e6edf3", muted: "#9198a1", line: "#3d444d", card: "#151b23", accent: "#4ade80" },
};

const SANS = "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * The mark, on a 16×16 pixel grid so it stays sharp down to a 16 px favicon: a page with
 * a folded corner; down its left side a line of history with three commits, each pinning
 * a line of text; the top one — what is true now — in the accent colour; and the history
 * running on, out through the bottom of the page. `#` ink, `g` accent.
 */
const MARK = [
  "................",
  "..#########.....",
  "..#.......##....",
  "..#.......#.#...",
  "..#.......####..",
  "..#..........#..",
  "..#.ggg.gggg.#..",
  "..#..#.......#..",
  "..#..#.......#..",
  "..#.###.####.#..",
  "..#..#.......#..",
  "..#..#.......#..",
  "..#.###.###..#..",
  "..############..",
  ".....#..........",
  ".....#..........",
];

/**
 * The wordmark's bitmap face: 7 rows, ascenders in rows 0–1, x-height in rows 2–6. Only
 * the letters of the name.
 */
const FONT = {
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".####"],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#..", ".#..", "###.", ".#..", ".#..", ".#..", "..##"],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  c: [".....", ".....", ".####", "#....", "#....", "#....", ".####"],
};

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

function mark(t, x = 0, y = 0, cell = 4) {
  const out = [];
  MARK.forEach((row, r) => [...row].forEach((p, c) => {
    if (p !== ".") out.push(rect(x + c * cell, y + r * cell, cell, cell, p === "g" ? t.accent : t.ink));
  }));
  return `<g shape-rendering="crispEdges">${out.join("")}</g>`;
}

/** `word` in the bitmap face, bold — each pixel smeared one cell right, as bitmap faces do. */
function pixelWord(word, fill, x, y, cell) {
  const out = [];
  let col = 0;
  for (const ch of word) {
    const glyph = FONT[ch];
    glyph.forEach((row, r) => [...row].forEach((p, c) => {
      if (p === "#") out.push(rect(x + (col + c) * cell, y + r * cell, cell * 2, cell, fill));
    }));
    col += glyph[0].length + 2;
  }
  return { body: `<g shape-rendering="crispEdges">${out.join("")}</g>`, width: (col - 1) * cell };
}

const svg = (w, h, body, title) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <title>${esc(title)}</title>
  ${body}
</svg>
`;

/** Mark and wordmark: "honest" in ink, "docs" muted, sitting on the page's bottom edge. */
function logo(t) {
  const cell = 5, markTop = 4, textX = 82;
  const textTop = markTop + 14 * 4 - 7 * cell;
  const a = pixelWord("honest", t.ink, textX, textTop, cell);
  const b = pixelWord("docs", t.muted, textX + a.width + cell, textTop, cell);
  return svg(textX + a.width + cell + b.width, 72, `${mark(t, 0, markTop)}\n  ${a.body}\n  ${b.body}`, "honestdocs");
}

/** The README diagram: who writes what, what is derived, what guards it. */
function howItWorks(t) {
  const W = 880, H = 250, cardW = 264, gap = 44, top = 18, cardH = 216;
  const cards = [
    {
      kicker: "1 · PEOPLE WRITE",
      title: "What only people know",
      lines: [
        ["mono", "title · status"],
        ["mono", "supersedes · related"],
        ["gap"],
        ["sans", "and the words: the reasoning,"],
        ["sans", "what was rejected, and why"],
      ],
    },
    {
      kicker: "2 · HONESTDOCS DERIVES",
      title: "What nobody should type",
      lines: [
        ["pair", "progress", "the checklist"],
        ["pair", "files", "commit trailers"],
        ["pair", "updated", "git history"],
        ["pair", "superseded-by", "the newer doc"],
      ],
    },
    {
      kicker: "3 · CHECK GUARDS",
      title: "CI fails when it lies",
      lines: [
        ["sans", "a replaced doc still current"],
        ["sans", "a checklist count gone stale"],
        ["sans", "a rule's named test deleted"],
        ["sans", "a link to a doc that is gone"],
        ["sans", "an index out of date"],
      ],
    },
  ];

  const parts = [];
  cards.forEach((card, i) => {
    const x = i * (cardW + gap);
    const accent = i === 1;
    parts.push(`<rect x="${x + 1}" y="${top}" width="${cardW - 2}" height="${cardH}" rx="14" fill="${t.card}" stroke="${accent ? t.accent : t.line}" stroke-width="${accent ? 2 : 1.5}"/>`);
    parts.push(`<text x="${x + 22}" y="${top + 32}" font-family="${SANS}" font-size="11" font-weight="700" letter-spacing="1.2" fill="${accent ? t.accent : t.muted}">${esc(card.kicker)}</text>`);
    parts.push(`<text x="${x + 22}" y="${top + 56}" font-family="${SANS}" font-size="17" font-weight="700" fill="${t.ink}">${esc(card.title)}</text>`);
    let y = top + 90;
    for (const [kind, a, b] of card.lines) {
      if (kind === "gap") {
        y += 6;
        continue;
      }
      if (kind === "pair") {
        parts.push(`<text x="${x + 22}" y="${y}" font-family="${MONO}" font-size="13" fill="${t.ink}">${esc(a)}</text>`);
        parts.push(`<text x="${x + 135}" y="${y}" font-family="${SANS}" font-size="13" fill="${t.muted}">← ${esc(b)}</text>`);
      } else if (kind === "mono") {
        parts.push(`<text x="${x + 22}" y="${y}" font-family="${MONO}" font-size="13" fill="${t.ink}">${esc(a)}</text>`);
      } else {
        parts.push(`<text x="${x + 22}" y="${y}" font-family="${SANS}" font-size="13.5" fill="${t.muted}">${esc(a)}</text>`);
      }
      y += 25;
    }
    if (i < cards.length - 1) {
      const ax = x + cardW + 8, ay = top + cardH / 2;
      parts.push(`<path d="M${ax} ${ay}H${ax + gap - 16}M${ax + gap - 22} ${ay - 6}L${ax + gap - 16} ${ay}L${ax + gap - 22} ${ay + 6}" fill="none" stroke="${t.muted}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
  });
  return svg(W, H, parts.join("\n  "), "People write the reasoning; honestdocs derives progress, files, updated and superseded-by; check fails CI when the set lies.");
}

mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `logo-${name}.svg`), logo(t));
  writeFileSync(join(OUT, `how-it-works-${name}.svg`), howItWorks(t));
}
// The mark alone, for avatars and favicons: on its own tile so it reads on any background.
writeFileSync(join(OUT, "mark.svg"), svg(64, 64, `${rect(0, 0, 64, 64, THEMES.light.card)}\n  ${mark(THEMES.light)}`, "honestdocs"));
console.log("assets/ regenerated");
