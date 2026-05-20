/**
 * src/graph.ts
 *
 * Builds a directed link graph of all Les Pages Jèrriaises HTML pages and
 * extracts structural metrics: in-degree, PageRank, orphan detection,
 * dead links, connected components, and Louvain community clusters.
 *
 * Usage:  npx tsx src/graph.ts [--gexf]
 *   --gexf  Also write graph.gexf for Gephi import
 */

import * as fs from "fs";
import * as path from "path";
import Graph from "graphology";
import { connectedComponents, stronglyConnectedComponents } from "graphology-components";
import { degreeCentrality } from "graphology-metrics/centrality/degree";
import louvain from "graphology-communities-louvain";
import { write as writeGexf } from "graphology-gexf/node";
import { parseFile, extractInlineLinks } from "./parse";

const dir = "lespages/members.societe-jersiaise.org/geraint/jerriais";
const GEXF_FLAG = process.argv.includes("--gexf");

// ── 1. Scan all HTML files ──────────────────────────────────────────────────

const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".html"))
  .map((f) => ({ filename: f, stem: path.parse(f).name }));

console.log(`Scanning ${files.length} HTML files…`);

interface PageData {
  stem: string;
  title: string;
  author: string | undefined;
  authorSlug: string | undefined;
  topics: string[];
  related: string[];  // target stems
  inline: string[];   // target stems
}

function hrefToStem(href: string, sourceStem: string): string | null {
  // href may be like "foo.html", "../jerriais/foo.html", "foo", etc.
  // We only care about sibling .html links (same directory level)
  const clean = href.replace(/\.html$/, "").replace(/\/$/, "").replace(/^\.\//, "");
  if (clean.startsWith("../") || clean.startsWith("/") || clean.includes("://")) return null;
  if (clean.includes("/")) return null; // subdirectory — different section
  if (!clean || clean === sourceStem) return null;
  return clean;
}

const pages: PageData[] = [];
const stemSet = new Set<string>();

for (const { filename, stem } of files) {
  stemSet.add(stem);
  const buf = fs.readFileSync(path.join(dir, filename));

  let parsed: ReturnType<typeof parseFile>;
  try {
    parsed = parseFile(buf, { rewriteRelativeUrls: false });
  } catch {
    continue;
  }

  const relatedStems = (parsed.data.related as { url: string }[])
    .map((r) => hrefToStem(r.url, stem))
    .filter((s): s is string => s !== null);

  const inlineHrefs = extractInlineLinks(buf);
  const inlineStems = inlineHrefs
    .map((h) => hrefToStem(h, stem))
    .filter((s): s is string => s !== null);

  pages.push({
    stem,
    title: parsed.data.title as string,
    author: parsed.data.author as string | undefined,
    authorSlug: parsed.data.authorSlug as string | undefined,
    topics: (parsed.data.topics as string[]) ?? [],
    related: [...new Set(relatedStems)],
    inline: [...new Set(inlineStems)],
  });
}

console.log(`Parsed ${pages.length} pages.`);

// ── 2. Build directed graph ─────────────────────────────────────────────────

const graph = new Graph({ type: "directed", multi: false });

for (const page of pages) {
  graph.addNode(page.stem, {
    label: page.title || page.stem,
    author: page.author ?? "",
    authorSlug: page.authorSlug ?? "",
    topics: page.topics.join(", "),
  });
}

let deadLinks = 0;
const deadLinkMap: Record<string, string[]> = {};

for (const page of pages) {
  const addEdge = (target: string, type: "related" | "inline") => {
    if (!graph.hasNode(target)) {
      deadLinks++;
      if (!deadLinkMap[page.stem]) deadLinkMap[page.stem] = [];
      if (!deadLinkMap[page.stem].includes(target))
        deadLinkMap[page.stem].push(target);
      return;
    }
    if (!graph.hasEdge(page.stem, target)) {
      graph.addEdge(page.stem, target, { type });
    }
  };

  for (const t of page.related) addEdge(t, "related");
  for (const t of page.inline) addEdge(t, "inline");
}

console.log(`Graph: ${graph.order} nodes, ${graph.size} edges`);
console.log(`Dead link references: ${deadLinks}`);

// ── 3. Metrics ──────────────────────────────────────────────────────────────

// In-degree (incoming links)
const inDegrees: Record<string, number> = {};
graph.forEachNode((node) => {
  inDegrees[node] = graph.inDegree(node);
});

// Orphan pages: in-degree = 0 (no other page links to them)
const orphans = Object.entries(inDegrees)
  .filter(([, d]) => d === 0)
  .map(([stem]) => stem)
  .sort();

// Top pages by in-degree
const topByInDegree = Object.entries(inDegrees)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

// Degree centrality
const centrality = degreeCentrality(graph);

// Connected components (treat as undirected for weak connectivity)
const undirected = new Graph({ type: "undirected", multi: false });
graph.forEachNode((n, attrs) => undirected.addNode(n, attrs));
graph.forEachEdge((_e, _attrs, source, target) => {
  if (!undirected.hasEdge(source, target)) undirected.addEdge(source, target);
});
const components = connectedComponents(undirected);
const componentSizes = components.map((c) => c.length).sort((a, b) => b - a);

// Strongly connected components (directed cycles)
const sccs = stronglyConnectedComponents(graph);
const largeSCCs = sccs.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);

// Louvain community detection (undirected)
const communities: Record<string, number> = louvain(undirected);
const communityGroups: Record<number, string[]> = {};
for (const [node, comm] of Object.entries(communities)) {
  if (!communityGroups[comm]) communityGroups[comm] = [];
  communityGroups[comm].push(node);
}
const topCommunities = Object.entries(communityGroups)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

// ── 4. Report ───────────────────────────────────────────────────────────────

const stemToPage = Object.fromEntries(pages.map((p) => [p.stem, p]));

const report = {
  summary: {
    nodes: graph.order,
    edges: graph.size,
    orphans: orphans.length,
    deadLinkSources: Object.keys(deadLinkMap).length,
    deadLinkReferences: deadLinks,
    weaklyConnectedComponents: components.length,
    largestComponentSize: componentSizes[0] ?? 0,
    stronglyConnectedComponents: sccs.length,
    largestSCCSize: largeSCCs[0]?.length ?? 0,
    louvainCommunities: Object.keys(communityGroups).length,
  },
  topByInDegree: topByInDegree.map(([stem, deg]) => ({
    stem,
    title: stemToPage[stem]?.title ?? stem,
    inDegree: deg,
    outDegree: graph.outDegree(stem),
  })),
  orphans: orphans.slice(0, 50).map((stem) => ({
    stem,
    title: stemToPage[stem]?.title ?? stem,
    author: stemToPage[stem]?.authorSlug,
  })),
  orphanCount: orphans.length,
  deadLinks: Object.entries(deadLinkMap)
    .slice(0, 30)
    .map(([stem, targets]) => ({ stem, targets })),
  componentSizes: componentSizes.slice(0, 10),
  largeSCCs: largeSCCs.slice(0, 5).map((c) => ({
    size: c.length,
    members: c.slice(0, 10),
  })),
  topCommunities: topCommunities.map(([id, members]) => ({
    id: Number(id),
    size: members.length,
    sample: members.slice(0, 8).map((s) => stemToPage[s]?.title ?? s),
  })),
};

fs.writeFileSync("graph-report.json", JSON.stringify(report, null, 2));
console.log("\n✅ graph-report.json written");

// Print summary
console.log("\n── Summary ──────────────────────────────────────────");
console.log(`Nodes:              ${report.summary.nodes}`);
console.log(`Edges:              ${report.summary.edges}`);
console.log(`Orphan pages:       ${report.summary.orphans}`);
console.log(`Dead link refs:     ${report.summary.deadLinkReferences} (from ${report.summary.deadLinkSources} pages)`);
console.log(`Weak components:    ${report.summary.weaklyConnectedComponents} (largest: ${report.summary.largestComponentSize})`);
console.log(`Strong components:  ${report.summary.stronglyConnectedComponents} (largest SCC: ${report.summary.largestSCCSize})`);
console.log(`Louvain clusters:   ${report.summary.louvainCommunities}`);

console.log("\n── Top 10 pages by in-degree ────────────────────────");
for (const { stem, title, inDegree } of report.topByInDegree.slice(0, 10)) {
  console.log(`  [${String(inDegree).padStart(4)}]  ${stem.padEnd(25)}  ${title.substring(0, 50)}`);
}

// ── 5. GEXF export ──────────────────────────────────────────────────────────

if (GEXF_FLAG) {
  // Annotate nodes with community and in-degree for Gephi
  graph.forEachNode((node) => {
    graph.setNodeAttribute(node, "community", communities[node] ?? -1);
    graph.setNodeAttribute(node, "inDegree", graph.inDegree(node));
    graph.setNodeAttribute(node, "outDegree", graph.outDegree(node));
  });
  writeGexf(graph, "graph.gexf");
  console.log("✅ graph.gexf written (open in Gephi)");
}
