/**
 * AI-assisted audit for Les Pages Jèrriaises migration.
 *
 * Requires:
 *   - audit.json (run `tsx src/audit.ts` first)
 *   - _site/ build (run `npm run build` first)
 *   - Copilot CLI installed and authenticated (`copilot` on PATH)
 *
 * Usage:
 *   tsx src/audit-ai.ts
 *
 * Options (env vars):
 *   AUDIT_SAMPLE=20        Pages to sample per category (default: 20)
 *   AUDIT_MODEL=gpt-5-mini Copilot model name (default: gpt-5-mini)
 *   AUDIT_CONCURRENCY=3    Parallel copilot invocations (default: 3)
 */

import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";

const SOURCE_DIR = "lespages/members.societe-jersiaise.org/geraint/jerriais";
const OUTPUT_DIR = "_site/corpus/jerriais";
const AUDIT_JSON = "audit.json";
const AUDIT_SUMMARY = "audit-summary.md";

const SAMPLE_SIZE = parseInt(process.env.AUDIT_SAMPLE ?? "20", 10);
const MODEL = process.env.AUDIT_MODEL ?? "gpt-5-mini";
const CONCURRENCY = parseInt(process.env.AUDIT_CONCURRENCY ?? "3", 10);

// ── Types ──────────────────────────────────────────────────────────────────

interface PageRecord {
  path: string;
  type: string;
  inputWordCount: number;
  outputExists: boolean | null;
  aiPageType?: string;
  aiExtractionChallenges?: string;
  aiScriptRisk?: string;
  aiMigrationQuality?: "GOOD" | "PARTIAL" | "EMPTY" | "BROKEN";
  aiMissingContent?: string;
  [key: string]: unknown;
}

// ── HTML helpers ───────────────────────────────────────────────────────────

const MAX_HTML_CHARS = 6000;

function truncateHtml(html: string): string {
  if (html.length <= MAX_HTML_CHARS) return html;
  const cut = html.lastIndexOf("<", MAX_HTML_CHARS);
  return html.slice(0, cut > 0 ? cut : MAX_HTML_CHARS) + "\n<!-- [truncated] -->";
}

function readSource(relPath: string): string {
  const fullPath = path.join(SOURCE_DIR, relPath);
  if (!fs.existsSync(fullPath)) return "(not found)";
  return truncateHtml(fs.readFileSync(fullPath, "latin1"));
}

function outputSlug(relPath: string): string {
  const p = path.parse(relPath);
  return (p.dir ? path.join(p.dir, p.name) : p.name).replace(/\\/g, "/");
}

function readOutput(relPath: string): string {
  const slug = outputSlug(relPath);
  const outputPath = path.join(OUTPUT_DIR, slug, "index.html");
  if (!fs.existsSync(outputPath)) return "(not generated)";
  const $ = cheerio.load(fs.readFileSync(outputPath, "utf-8"));
  return truncateHtml($("article").html() ?? $("body").html() ?? "");
}

// ── Prompt ─────────────────────────────────────────────────────────────────

function buildPrompt(source: string, output: string): string {
  return `You are auditing the migration of an old HTML website to a modern static site.
The content is in Jèrriais (a Norman language — you don't need to understand it, do not translate it).
Ignore navigation banners, back-to-top links, and the site header image (pagesjerriaises.jpg).

Answer the following. Be concise — one or two sentences each.

1. PAGE TYPE: What type of page is this? (article, poem, index/navigation, quiz, random-content generator, etc.)
2. EXTRACTION CHALLENGES: What structural or JavaScript issues would make it hard to extract clean text content?
3. SCRIPT RISK: What content would be lost if all <script> tags were stripped? (If no scripts, say "none".)
4. MIGRATION QUALITY: Rate as GOOD / PARTIAL / EMPTY / BROKEN — does the migrated output preserve all visible text from the original?
5. MISSING CONTENT: List any specific content present in the original but absent or garbled in the output. (If none, say "none".)

Format your answer EXACTLY as:
PAGE TYPE: ...
EXTRACTION CHALLENGES: ...
SCRIPT RISK: ...
MIGRATION QUALITY: GOOD|PARTIAL|EMPTY|BROKEN
MISSING CONTENT: ...

--- ORIGINAL HTML ---
${source}

--- MIGRATED OUTPUT ---
${output}`;
}

// ── Copilot invocation ─────────────────────────────────────────────────────

interface AIVerdict {
  pageType: string;
  extractionChallenges: string;
  scriptRisk: string;
  migrationQuality: "GOOD" | "PARTIAL" | "EMPTY" | "BROKEN";
  missingContent: string;
}

function parseVerdict(text: string): AIVerdict {
  const get = (label: string): string => {
    const match = text.match(
      new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z ]+:|$)`, "is")
    );
    return match?.[1]?.trim() ?? "";
  };
  const quality = get("MIGRATION QUALITY")
    .toUpperCase()
    .match(/GOOD|PARTIAL|EMPTY|BROKEN/)?.[0] as AIVerdict["migrationQuality"];
  return {
    pageType: get("PAGE TYPE"),
    extractionChallenges: get("EXTRACTION CHALLENGES"),
    scriptRisk: get("SCRIPT RISK"),
    migrationQuality: quality ?? "BROKEN",
    missingContent: get("MISSING CONTENT"),
  };
}

function callCopilot(prompt: string): Promise<AIVerdict | null> {
  return new Promise((resolve) => {
    const child = spawn(
      "copilot",
      ["--model", MODEL, "--prompt", prompt, "--allow-all-tools"],
      { stdio: ["ignore", "pipe", "ignore"] }
    );

    let stdout = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    const timeout = setTimeout(() => {
      child.kill();
      resolve(null);
    }, 60_000);

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !stdout.trim()) {
        resolve(null);
        return;
      }
      resolve(parseVerdict(stdout));
    });

    child.on("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
  });
}

// ── Sampling ───────────────────────────────────────────────────────────────

function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

// ── Concurrency pool ───────────────────────────────────────────────────────

async function processWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
  concurrency: number
): Promise<void> {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      await fn(items[next++]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );
}

// ── Summary update ─────────────────────────────────────────────────────────

function buildAiSummarySection(records: PageRecord[]): string {
  const reviewed = records.filter((r) => r.aiMigrationQuality);

  const byType: Record<string, PageRecord[]> = {};
  for (const r of reviewed) {
    (byType[r.type] ??= []).push(r);
  }

  const qualityRows = Object.entries(byType)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([type, pages]) => {
      const c = { GOOD: 0, PARTIAL: 0, EMPTY: 0, BROKEN: 0 };
      for (const p of pages) c[p.aiMigrationQuality as keyof typeof c]++;
      return `| ${type.padEnd(18)} | ${pages.length} | ${c.GOOD} | ${c.PARTIAL} | ${c.EMPTY} | ${c.BROKEN} |`;
    });

  const flagged = reviewed
    .filter(
      (r) =>
        r.aiMigrationQuality === "BROKEN" || r.aiMigrationQuality === "EMPTY"
    )
    .map(
      (r) =>
        `- \`${r.path}\` [${r.aiMigrationQuality}] — ${r.aiMissingContent ?? ""}`
    );

  return `## AI review summary

Reviewed ${reviewed.length} pages (sampled ~${SAMPLE_SIZE} per category) using ${MODEL}.

### Quality by page type

| Type               | Reviewed | GOOD | PARTIAL | EMPTY | BROKEN |
|--------------------|:--------:|:----:|:-------:|:-----:|:------:|
${qualityRows.join("\n")}

### Flagged pages (BROKEN or EMPTY)

${flagged.length > 0 ? flagged.join("\n") : "_None._"}
`;
}

// ── Main ───────────────────────────────────────────────────────────────────

(async () => {

if (!fs.existsSync(AUDIT_JSON)) {
  console.error(
    `Error: ${AUDIT_JSON} not found. Run \`tsx src/audit.ts\` first.`
  );
  process.exit(1);
}

const records: PageRecord[] = JSON.parse(
  fs.readFileSync(AUDIT_JSON, "utf-8")
);

const byType: Record<string, PageRecord[]> = {};
for (const r of records) {
  (byType[r.type] ??= []).push(r);
}

const toReview: PageRecord[] = [];
for (const [type, pages] of Object.entries(byType)) {
  const sampled = sample(pages, SAMPLE_SIZE);
  console.log(
    `  ${type.padEnd(20)} ${String(pages.length).padStart(4)} pages → sampling ${sampled.length}`
  );
  toReview.push(...sampled);
}

console.log(
  `\nReviewing ${toReview.length} pages with ${MODEL} (concurrency: ${CONCURRENCY})…\n`
);

let done = 0;
await processWithConcurrency(
  toReview,
  async (record) => {
    const source = readSource(record.path);
    const output = readOutput(record.path);
    const prompt = buildPrompt(source, output);
    const verdict = await callCopilot(prompt);

    if (verdict) {
      record.aiPageType = verdict.pageType;
      record.aiExtractionChallenges = verdict.extractionChallenges;
      record.aiScriptRisk = verdict.scriptRisk;
      record.aiMigrationQuality = verdict.migrationQuality;
      record.aiMissingContent = verdict.missingContent;
    }

    done++;
    const pct = ((done / toReview.length) * 100).toFixed(0);
    process.stdout.write(
      `\r  ${done}/${toReview.length} (${pct}%) — ${record.path.slice(0, 45).padEnd(45)}`
    );
  },
  CONCURRENCY
);

console.log("\n\nWriting results…");
fs.writeFileSync(AUDIT_JSON, JSON.stringify(records, null, 2));
console.log(`Updated: ${AUDIT_JSON}`);

const existing = fs.existsSync(AUDIT_SUMMARY)
  ? fs.readFileSync(AUDIT_SUMMARY, "utf-8")
  : "";
const withoutAiSection = existing
  .replace(/## AI review summary[\s\S]*/, "")
  .trimEnd();
const updated =
  withoutAiSection + "\n\n" + buildAiSummarySection(records);
fs.writeFileSync(AUDIT_SUMMARY, updated);
console.log(`Updated: ${AUDIT_SUMMARY}`);

const counts = toReview
  .filter((r) => r.aiMigrationQuality)
  .reduce(
    (acc, r) => {
      acc[r.aiMigrationQuality!] = (acc[r.aiMigrationQuality!] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
console.log("\nVerdict breakdown:");
for (const [v, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${v.padEnd(10)} ${n}`);
}

})();
