/**
 * Audit tool for Les Pages Jèrriaises migration.
 *
 * Usage:
 *   npm run build           # required for output quality metrics
 *   tsx src/audit.ts        # produces audit.json and audit-summary.md
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { AUTHORS, parseFile } from "./parse";

const SOURCE_DIR = "lespages/members.societe-jersiaise.org/geraint/jerriais";
const OUTPUT_DIR = "_site/corpus/jerriais";
const AUDIT_JSON = "audit.json";
const AUDIT_SUMMARY = "audit-summary.md";

// ── Types ──────────────────────────────────────────────────────────────────

type PageType =
  | "prose"
  | "author-index"
  | "section-index"
  | "frameset-wrapper"
  | "hot-potatoes"
  | "random-content"
  | "audio"
  | "unknown";

type ScriptType = "hot-potatoes" | "math-random" | "document-write" | "other" | null;

interface PageRecord {
  path: string;
  // Source classification
  type: PageType;
  hasScript: boolean;
  scriptType: ScriptType;
  hasFrameset: boolean;
  hasAudio: boolean;
  hasTables: boolean;
  hasViyizEtout: boolean;
  detectedAuthor: string | null;
  multiAuthorSuspected: boolean;
  inputWordCount: number;
  urlClash: boolean;
  // Output quality (null if output not built)
  outputExists: boolean | null;
  outputWordCount: number | null;
  contentRetentionRatio: number | null;
  hasScriptArtifact: boolean | null;
  hasEmptyBody: boolean | null;
  authorMatch: boolean | null;
  // AI review (filled in by audit-ai.ts)
  aiPageType?: string;
  aiExtractionChallenges?: string;
  aiScriptRisk?: string;
  aiMigrationQuality?: "GOOD" | "PARTIAL" | "EMPTY" | "BROKEN";
  aiMissingContent?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 0).length;
}

function visibleText($: cheerio.CheerioAPI, selector = "body"): string {
  const el = $(selector).clone();
  el.find("script, style").remove();
  return el.text().replace(/\s+/g, " ").trim();
}

function detectScriptType(html: string): ScriptType {
  if (/Hot Potatoes/i.test(html)) return "hot-potatoes";
  if (/Math\.random/i.test(html)) return "math-random";
  if (/document\.write/i.test(html)) return "document-write";
  if (/<script/i.test(html)) return "other";
  return null;
}

function detectPageType(
  $: cheerio.CheerioAPI,
  html: string,
  basename: string
): PageType {
  if (/<frameset/i.test(html)) return "frameset-wrapper";
  if (/Hot Potatoes/i.test(html)) return "hot-potatoes";
  if (/Math\.random|RandomURL/i.test(html) || /document\.write\s*\(/i.test(html))
    return "random-content";

  // Author index: basename matches an AUTHORS slug
  if (Object.keys(AUTHORS).includes(basename)) return "author-index";

  const audioExts = /\.(wav|mp3|midi?|ogg|aiff?)\b/i;
  if (audioExts.test(html)) return "audio";

  // Section index heuristic: lots of links relative to body text
  const bodyText = visibleText($);
  const linkCount = $("body a[href]").length;
  const wordCount = countWords(bodyText);
  if (linkCount >= 10 && wordCount < linkCount * 8) return "section-index";

  return "prose";
}

function outputSlug(relPath: string): string {
  const p = path.parse(relPath);
  // Matches worker.ts: subdirs preserved, .html -> slug directory
  const dir = p.dir ? path.join(p.dir, p.name) : p.name;
  return dir.replace(/\\/g, "/");
}

function hasUrlClash(relPath: string, sourceDir: string): boolean {
  const p = path.parse(relPath);
  if (p.ext !== ".html") return false;
  const subdirIndex = path.join(sourceDir, p.dir, p.name, "index.html");
  return fs.existsSync(subdirIndex);
}

function auditOutput(slug: string, detectedAuthor: string | null, output: PageRecord): void {
  const outputPath = path.join(OUTPUT_DIR, slug, "index.html");
  if (!fs.existsSync(outputPath)) {
    output.outputExists = false;
    output.outputWordCount = null;
    output.contentRetentionRatio = null;
    output.hasScriptArtifact = null;
    output.hasEmptyBody = null;
    output.authorMatch = null;
    return;
  }

  output.outputExists = true;
  const html = fs.readFileSync(outputPath, "utf-8");
  const $ = cheerio.load(html);

  const text = visibleText($);
  output.outputWordCount = countWords(text);
  output.contentRetentionRatio =
    output.inputWordCount > 0
      ? Math.min(1, output.outputWordCount / output.inputWordCount)
      : null;
  output.hasScriptArtifact = /document\.write|<!-- .* -->/.test(html);
  output.hasEmptyBody = output.outputWordCount < 10;

  if (detectedAuthor) {
    output.authorMatch = html.includes(detectedAuthor);
  } else {
    output.authorMatch = null;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

function auditFile(relPath: string): PageRecord {
  const fullPath = path.join(SOURCE_DIR, relPath);
  const html = fs.readFileSync(fullPath, "latin1");
  const buf = fs.readFileSync(fullPath);
  const $ = cheerio.load(html);
  const basename = path.parse(relPath).name;

  const bodyText = visibleText($);
  const inputWordCount = countWords(bodyText);
  const hasScript = /<script/i.test(html);
  const scriptType = detectScriptType(html);
  const hasFrameset = /<frameset/i.test(html);
  const hasAudio = /\.(wav|mp3|midi?|ogg|aiff?)\b/i.test(html);
  const hasTables = /<table/i.test(html);
  const hasViyizEtout = $('font[size="2"]').find("a").length > 0;

  const { data: parseData } = parseFile(buf, { rewriteRelativeUrls: false });
  const detectedAuthor = (parseData.author as string | undefined) ?? null;
  const multiAuthorSuspected = parseData.multiAuthorSuspected as boolean;

  const type = detectPageType($, html, basename);
  const urlClash = hasUrlClash(relPath, SOURCE_DIR);

  const record: PageRecord = {
    path: relPath,
    type,
    hasScript,
    scriptType,
    hasFrameset,
    hasAudio,
    hasTables,
    hasViyizEtout,
    detectedAuthor,
    multiAuthorSuspected,
    inputWordCount,
    urlClash,
    outputExists: null,
    outputWordCount: null,
    contentRetentionRatio: null,
    hasScriptArtifact: null,
    hasEmptyBody: null,
    authorMatch: null,
  };

  const slug = outputSlug(relPath);
  auditOutput(slug, detectedAuthor, record);

  return record;
}

function collectHtmlFiles(dir: string, base: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(base, full);
    if (entry.isDirectory()) {
      results.push(...collectHtmlFiles(full, base));
    } else if (entry.isFile() && path.extname(entry.name) === ".html") {
      results.push(rel);
    }
  }
  return results;
}

function formatTable(
  rows: { label: string; value: string | number }[]
): string {
  const w = Math.max(...rows.map((r) => r.label.length));
  return rows.map((r) => `| ${r.label.padEnd(w)} | ${r.value} |`).join("\n");
}

function generateSummary(records: PageRecord[]): string {
  const total = records.length;
  const built = records.filter((r) => r.outputExists === true).length;
  const notBuilt = records.filter((r) => r.outputExists === false).length;
  const clashes = records.filter((r) => r.urlClash);

  const byType: Record<string, PageRecord[]> = {};
  for (const r of records) {
    (byType[r.type] ??= []).push(r);
  }

  const typeRows = Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([type, pages]) => {
      const empty = pages.filter((p) => p.hasEmptyBody).length;
      const artifact = pages.filter((p) => p.hasScriptArtifact).length;
      const avgRetention =
        pages
          .filter((p) => p.contentRetentionRatio !== null)
          .reduce((s, p) => s + (p.contentRetentionRatio ?? 0), 0) /
        (pages.filter((p) => p.contentRetentionRatio !== null).length || 1);
      return `| ${type.padEnd(18)} | ${String(pages.length).padStart(5)} | ${(avgRetention * 100).toFixed(0).padStart(9)}% | ${String(empty).padStart(5)} | ${String(artifact).padStart(8)} |`;
    });

  const urlClashSection =
    clashes.length === 0
      ? "_None detected._"
      : clashes.map((r) => `- \`${r.path}\``).join("\n");

  const scriptTypeRows = Object.entries(
    records.reduce(
      (acc, r) => {
        if (r.scriptType) acc[r.scriptType] = (acc[r.scriptType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    )
  )
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `| ${t.padEnd(18)} | ${n} |`);

  return `# Audit Summary

Generated: ${new Date().toISOString()}

## Overview

| Metric | Count |
|---|---|
| Total HTML files | ${total} |
| Output files built | ${built} |
| Output files missing | ${notBuilt} |
| Multi-author suspected | ${records.filter((r) => r.multiAuthorSuspected).length} |

## By page type

| Type               | Count | Avg retention | Empty | Artifacts |
|--------------------|------:|:-------------:|------:|----------:|
${typeRows.join("\n")}

## Script types

| Script type        | Count |
|--------------------|-------|
${scriptTypeRows.join("\n")}

## URL clashes

${urlClashSection}

## Low-retention pages (built but <20% content retained)

${
  records
    .filter(
      (r) =>
        r.outputExists &&
        r.contentRetentionRatio !== null &&
        r.contentRetentionRatio < 0.2 &&
        r.inputWordCount > 30
    )
    .sort((a, b) => (a.contentRetentionRatio ?? 0) - (b.contentRetentionRatio ?? 0))
    .slice(0, 40)
    .map(
      (r) =>
        `- \`${r.path}\` — ${((r.contentRetentionRatio ?? 0) * 100).toFixed(0)}% retention (${r.inputWordCount} → ${r.outputWordCount} words, type: ${r.type})`
    )
    .join("\n") || "_None._"
}

## AI review summary

_Run \`tsx src/audit-ai.ts\` to populate AI verdicts._
`;
}

// ── Entry point ────────────────────────────────────────────────────────────

const files = collectHtmlFiles(SOURCE_DIR, SOURCE_DIR);
console.log(`Auditing ${files.length} HTML files…`);

const records: PageRecord[] = [];
let i = 0;
for (const file of files) {
  records.push(auditFile(file));
  i++;
  if (i % 500 === 0) process.stdout.write(`  ${i}/${files.length}\n`);
}

const outputBuilt = fs.existsSync(OUTPUT_DIR);
if (!outputBuilt) {
  console.warn(
    "\nWarning: _site/corpus/jerriais not found — output quality metrics skipped.\nRun `npm run build` first for full results.\n"
  );
}

fs.writeFileSync(AUDIT_JSON, JSON.stringify(records, null, 2));
console.log(`Written: ${AUDIT_JSON}`);

const summary = generateSummary(records);
fs.writeFileSync(AUDIT_SUMMARY, summary);
console.log(`Written: ${AUDIT_SUMMARY}`);

// Print a quick overview to stdout
const byType = records.reduce(
  (acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);
console.log("\nPage type breakdown:");
for (const [type, count] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(20)} ${count}`);
}
