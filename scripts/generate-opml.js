#!/usr/bin/env node
// Generates feeds.opml from README.md feed entries.
// Usage: node scripts/generate-opml.js [--stdout]

const fs = require('fs');
const path = require('path');

const README = path.join(__dirname, '..', 'README.md');
const OUTPUT = path.join(__dirname, '..', 'feeds.opml');
const toStdout = process.argv.includes('--stdout');

const ENTRY = /^\+ \[([^\]]+)\]\(([^)]+)\).*\(\[feed\]\(([^)]+)\)\)/;
const HEADING = /^## (.+)/;

function escape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const lines = fs.readFileSync(README, 'utf8').split('\n');

/** @type {Map<string, Array<{name: string, htmlUrl: string, xmlUrl: string}>>} */
const sections = new Map();
let current = null;

for (const line of lines) {
  const h = line.match(HEADING);
  if (h) {
    current = h[1].trim();
    continue;
  }
  if (!current) continue;
  const e = line.match(ENTRY);
  if (!e) continue;
  const [, name, htmlUrl, xmlUrl] = e;
  if (!sections.has(current)) sections.set(current, []);
  sections.get(current).push({ name, htmlUrl, xmlUrl });
}

const groups = [...sections.entries()].filter(([, entries]) => entries.length > 0);

const outlines = groups.map(([section, entries]) => {
  const children = entries.map(({ name, htmlUrl, xmlUrl }) =>
    `      <outline type="rss" text="${escape(name)}" title="${escape(name)}" xmlUrl="${escape(xmlUrl)}" htmlUrl="${escape(htmlUrl)}"/>`
  ).join('\n');
  return `    <outline text="${escape(section)}" title="${escape(section)}">\n${children}\n    </outline>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Dev Lists</title></head>
  <body>
${outlines}
  </body>
</opml>
`;

if (toStdout) {
  process.stdout.write(xml);
} else {
  fs.writeFileSync(OUTPUT, xml);
  const count = groups.reduce((n, [, e]) => n + e.length, 0);
  console.log(`Wrote ${OUTPUT} — ${groups.length} sections, ${count} feeds`);
}
