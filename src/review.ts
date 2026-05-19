/**
 * Manual review tool for Les Pages Jèrriaises migration.
 *
 * Usage:
 *   npm run build         # first time only – build _site/
 *   tsx src/review.ts     # starts server at http://localhost:3001
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

const AUDIT_JSON = "audit.json";
const SOURCE_DIR = "lespages/members.societe-jersiaise.org/geraint/jerriais";
const SITE_DIR = "_site";
const PORT = 3001;

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageRecord {
  path: string;
  type: string;
  inputWordCount: number;
  contentRetentionRatio: number | null;
  outputExists: boolean | null;
  hasEmptyBody: boolean | null;
  hasScriptArtifact: boolean | null;
  aiMigrationQuality?: string;
  reviewVerdict?: "GOOD" | "PARTIAL" | "BROKEN" | "SKIP";
  reviewTags?: string[];
  reviewNote?: string;
  reviewedAt?: string;
  [key: string]: unknown;
}

// ── Data ──────────────────────────────────────────────────────────────────────

let records: PageRecord[] = [];

function loadRecords(): void {
  if (!fs.existsSync(AUDIT_JSON)) {
    console.error(`Error: ${AUDIT_JSON} not found. Run: tsx src/audit.ts`);
    process.exit(1);
  }
  records = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf-8"));
  console.log(`Loaded ${records.length} pages from ${AUDIT_JSON}`);
}

function saveRecords(): void {
  fs.writeFileSync(AUDIT_JSON, JSON.stringify(records, null, 2));
}

// ── Static file serving ───────────────────────────────────────────────────────

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
};

function serveStatic(
  res: http.ServerResponse,
  filePath: string,
  charset?: string
): void {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found: " + filePath);
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  let contentType = MIME_TYPES[ext] ?? "application/octet-stream";
  if (charset) {
    contentType = contentType.split(";")[0] + "; charset=" + charset;
  }
  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
}

function safePath(base: string, rel: string): string | null {
  const resolved = path.resolve(base, rel.replace(/^\/+/, ""));
  const baseResolved = path.resolve(base);
  return resolved.startsWith(baseResolved + path.sep) ||
    resolved === baseResolved
    ? resolved
    : null;
}

// ── Request handler ───────────────────────────────────────────────────────────

function handleRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): void {
  const parsed = url.parse(req.url ?? "/", true);
  const pathname = decodeURIComponent(parsed.pathname ?? "/");

  // ── Review UI ────────────────────────────────────────────────────────────
  if (pathname === "/" || pathname === "/index.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(buildUI());
    return;
  }

  // ── API: page list ────────────────────────────────────────────────────────
  if (pathname === "/api/pages" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(records));
    return;
  }

  // ── API: save verdict ─────────────────────────────────────────────────────
  if (pathname === "/api/verdict" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const { path: pagePath, verdict, tags, note } = JSON.parse(body);
        const record = records.find((r) => r.path === pagePath);
        if (!record) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Page not found: " + pagePath);
          return;
        }
        record.reviewVerdict = verdict || undefined;
        record.reviewTags = tags?.length ? tags : undefined;
        record.reviewNote = note || undefined;
        record.reviewedAt = new Date().toISOString();
        saveRecords();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400, { "Content-Type": "text/plain" });
        res.end("Bad request");
      }
    });
    return;
  }

  // ── Original HTML (served from lespages source dir) ───────────────────────
  if (pathname.startsWith("/original/")) {
    const rel = pathname.slice("/original/".length);
    const filePath = safePath(SOURCE_DIR, rel);
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    // Source files are latin1; serve with that charset so Jèrriais chars render
    serveStatic(res, filePath, "iso-8859-1");
    return;
  }

  // ── Fallback: serve from _site/ (migrated pages, CSS, images, etc.) ────────
  const siteRel = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const siteFile = safePath(SITE_DIR, siteRel);
  if (siteFile) {
    // If it's a directory, try index.html
    if (fs.existsSync(siteFile) && fs.statSync(siteFile).isDirectory()) {
      serveStatic(res, path.join(siteFile, "index.html"));
    } else {
      serveStatic(res, siteFile);
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
}

// ── UI ────────────────────────────────────────────────────────────────────────

const TAGS = [
  "script-content",
  "table-layout",
  "missing-section",
  "wrong-author",
  "empty-output",
  "frameset",
  "encoding-issue",
];

function buildUI(): string {
  const tagChips = TAGS.map(
    (t) => `<span class="tag-chip" data-tag="${t}">${t}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Les Pages Jèrriaises — Migration Review</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:13px;background:#f0f0f0;display:flex;flex-direction:column;height:100vh;overflow:hidden}
/* Top bar */
#topbar{display:flex;align-items:center;gap:8px;padding:5px 10px;background:#1e293b;color:#e2e8f0;flex-shrink:0;flex-wrap:wrap}
#topbar h1{font-size:13px;font-weight:600;white-space:nowrap}
#page-info{flex:1;text-align:center;font-size:11px;color:#cbd5e1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#progress{font-size:11px;color:#94a3b8;white-space:nowrap}
.nav-btn{padding:3px 9px;border:1px solid #475569;background:#334155;color:#e2e8f0;cursor:pointer;border-radius:4px;font-size:12px}
.nav-btn:hover{background:#475569}
#queue-toggle{font-size:11px;padding:2px 7px;border:1px solid #475569;background:transparent;color:#94a3b8;border-radius:4px;cursor:pointer}
#queue-toggle.active{background:#0ea5e9;border-color:#0ea5e9;color:white}
/* Main layout */
#main{display:flex;flex:1;overflow:hidden}
/* Sidebar */
#sidebar{width:270px;flex-shrink:0;display:flex;flex-direction:column;background:white;border-right:1px solid #e2e8f0}
#filters{padding:7px;border-bottom:1px solid #e2e8f0;display:flex;flex-direction:column;gap:4px}
#search{width:100%;padding:4px 6px;border:1px solid #d1d5db;border-radius:4px;font-size:12px}
.filter-row{display:flex;gap:3px;flex-wrap:wrap}
.filter-chip{padding:2px 6px;border:1px solid #d1d5db;border-radius:12px;cursor:pointer;font-size:10px;background:white;color:#374151;white-space:nowrap}
.filter-chip.active{background:#3b82f6;border-color:#3b82f6;color:white}
/* Virtual list */
#list-container{flex:1;overflow-y:auto;position:relative}
#list-spacer{position:relative}
#list-rows{position:absolute;top:0;left:0;right:0}
.row{display:flex;align-items:center;padding:0 6px;height:26px;cursor:pointer;border-bottom:1px solid #f1f5f9;user-select:none}
.row:hover{background:#f8fafc}
.row.selected{background:#dbeafe}
.row-path{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:#374151}
.row-badge{flex-shrink:0;margin-left:3px;padding:1px 4px;border-radius:3px;font-size:9px;font-weight:700}
.badge-GOOD{background:#d1fae5;color:#065f46}
.badge-PARTIAL{background:#fef3c7;color:#92400e}
.badge-BROKEN{background:#fee2e2;color:#991b1b}
.badge-SKIP{background:#f1f5f9;color:#64748b}
.ret-bar{width:24px;height:5px;background:#e2e8f0;border-radius:3px;flex-shrink:0;margin-left:3px;overflow:hidden}
.ret-fill{height:100%;border-radius:3px}
/* Content */
#content{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
#frames{flex:1;display:flex;overflow:hidden}
.frame-pane{flex:1;display:flex;flex-direction:column;min-width:0}
.frame-pane:first-child{border-right:2px solid #e2e8f0}
.frame-label{padding:3px 8px;background:#f8fafc;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;font-weight:500;flex-shrink:0}
.frame-pane iframe{flex:1;border:none;background:white;width:100%;height:100%}
/* Verdict panel */
#verdict-panel{padding:7px 10px;background:white;border-top:1px solid #e2e8f0;flex-shrink:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.v-btn{padding:4px 10px;border:2px solid;border-radius:5px;cursor:pointer;font-size:11px;font-weight:700;background:white}
.v-btn[data-v="GOOD"]{border-color:#10b981;color:#10b981}
.v-btn[data-v="GOOD"].sel{background:#10b981;color:white}
.v-btn[data-v="PARTIAL"]{border-color:#f59e0b;color:#f59e0b}
.v-btn[data-v="PARTIAL"].sel{background:#f59e0b;color:white}
.v-btn[data-v="BROKEN"]{border-color:#ef4444;color:#ef4444}
.v-btn[data-v="BROKEN"].sel{background:#ef4444;color:white}
.v-btn[data-v="SKIP"]{border-color:#94a3b8;color:#94a3b8}
.v-btn[data-v="SKIP"].sel{background:#94a3b8;color:white}
.tag-chip{padding:2px 7px;border:1px solid #d1d5db;border-radius:12px;cursor:pointer;font-size:11px;background:white;color:#374151}
.tag-chip.sel{background:#6366f1;border-color:#6366f1;color:white}
#note-input{padding:3px 7px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;width:180px}
#save-btn{padding:4px 12px;background:#3b82f6;color:white;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:700;white-space:nowrap}
#save-btn:hover{background:#2563eb}
kbd{display:inline-block;padding:1px 3px;border:1px solid #d1d5db;border-radius:3px;font-size:9px;background:#f9fafb;color:#6b7280}
</style>
</head>
<body>

<div id="topbar">
  <h1>Les Pages Review</h1>
  <button class="nav-btn" id="btn-prev">&#8592; Prev</button>
  <button class="nav-btn" id="btn-next">Next &#8594;</button>
  <button id="queue-toggle" class="active">Queue mode</button>
  <div id="page-info">–</div>
  <div id="progress">Loading…</div>
</div>

<div id="main">
  <div id="sidebar">
    <div id="filters">
      <input id="search" type="search" placeholder="Filter by path…" />
      <div class="filter-row" id="type-filters"></div>
      <div class="filter-row" id="review-filters">
        <span class="filter-chip active" data-rf="all">All</span>
        <span class="filter-chip" data-rf="unreviewed">Unreviewed</span>
        <span class="filter-chip" data-rf="reviewed">Reviewed</span>
        <span class="filter-chip" data-rf="flagged">Flagged</span>
      </div>
    </div>
    <div id="list-container">
      <div id="list-spacer"><div id="list-rows"></div></div>
    </div>
  </div>

  <div id="content">
    <div id="frames">
      <div class="frame-pane">
        <div class="frame-label">Original &mdash; <span id="orig-label">–</span></div>
        <iframe id="frame-orig" sandbox="allow-scripts allow-same-origin"></iframe>
      </div>
      <div class="frame-pane">
        <div class="frame-label">Migrated &mdash; <span id="migr-label">–</span></div>
        <iframe id="frame-migr"></iframe>
      </div>
    </div>
    <div id="verdict-panel">
      <div style="display:flex;gap:4px">
        <button class="v-btn" data-v="GOOD">&#10003; Good <kbd>1</kbd></button>
        <button class="v-btn" data-v="PARTIAL">&#126; Partial <kbd>2</kbd></button>
        <button class="v-btn" data-v="BROKEN">&#10007; Broken <kbd>3</kbd></button>
        <button class="v-btn" data-v="SKIP">&#8211; Skip <kbd>4</kbd></button>
      </div>
      <div id="tags-row" style="display:flex;gap:3px;flex-wrap:wrap">${tagChips}</div>
      <input id="note-input" type="text" placeholder="Note…" />
      <button id="save-btn">Save &amp; Next <kbd>&#8629;</kbd></button>
    </div>
  </div>
</div>

<script>
(function() {
'use strict';

var ROW_HEIGHT = 26;
var allPages = [];
var filteredPages = [];
var currentIndex = 0;
var queueMode = true;
var searchText = '';
var typeFilter = 'all';
var reviewFilter = 'all';
var verdict = null;
var selectedTags = {};
var noteText = '';

function el(id) { return document.getElementById(id); }

var listContainer = el('list-container');
var listSpacer    = el('list-spacer');
var listRows      = el('list-rows');

// ── Priority score (lower = show first in queue) ────────────────────────────
function priorityScore(page) {
  var reviewed = page.reviewedAt ? 1000000 : 0;
  var aiPenalty = page.aiMigrationQuality === 'BROKEN' ? -500 :
                  page.aiMigrationQuality === 'PARTIAL' ? -200 : 0;
  var retention = page.contentRetentionRatio === null ? -1 : page.contentRetentionRatio;
  var emptyPenalty = page.hasEmptyBody ? -2 : 0;
  return reviewed + retention * 100 + aiPenalty + emptyPenalty;
}

// ── Load pages ──────────────────────────────────────────────────────────────
function loadPages() {
  fetch('/api/pages').then(function(r) { return r.json(); }).then(function(pages) {
    allPages = pages;
    buildTypeFilters();
    applyFilters();
    updateProgress();
    if (filteredPages.length > 0) navigateTo(0);
  });
}

// ── Filters ─────────────────────────────────────────────────────────────────
function applyFilters() {
  var pages = allPages.slice();

  if (searchText) {
    var q = searchText.toLowerCase();
    pages = pages.filter(function(p) { return p.path.toLowerCase().indexOf(q) >= 0; });
  }
  if (typeFilter !== 'all') {
    pages = pages.filter(function(p) { return p.type === typeFilter; });
  }
  if (reviewFilter === 'unreviewed') {
    pages = pages.filter(function(p) { return !p.reviewedAt; });
  } else if (reviewFilter === 'reviewed') {
    pages = pages.filter(function(p) { return !!p.reviewedAt; });
  } else if (reviewFilter === 'flagged') {
    pages = pages.filter(function(p) {
      return p.reviewVerdict === 'BROKEN' || p.reviewVerdict === 'PARTIAL' ||
             p.aiMigrationQuality === 'BROKEN' || p.aiMigrationQuality === 'PARTIAL';
    });
  }

  if (queueMode) {
    pages.sort(function(a, b) { return priorityScore(a) - priorityScore(b); });
  } else {
    pages.sort(function(a, b) { return a.path < b.path ? -1 : a.path > b.path ? 1 : 0; });
  }

  filteredPages = pages;
  renderList();
  updateProgress();
}

// ── Type filter chips ────────────────────────────────────────────────────────
function buildTypeFilters() {
  var types = {};
  allPages.forEach(function(p) { types[p.type] = (types[p.type] || 0) + 1; });
  var row = el('type-filters');
  row.innerHTML = '<span class="filter-chip active" data-tf="all">All types</span>';
  Object.keys(types).sort(function(a,b) { return types[b] - types[a]; }).forEach(function(type) {
    var chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.dataset.tf = type;
    chip.textContent = type + ' (' + types[type] + ')';
    row.appendChild(chip);
  });
  row.addEventListener('click', function(e) {
    var chip = e.target.closest('[data-tf]');
    if (!chip) return;
    typeFilter = chip.dataset.tf;
    row.querySelectorAll('.filter-chip').forEach(function(c) {
      c.classList.toggle('active', c.dataset.tf === typeFilter);
    });
    applyFilters();
  });
}

// ── Virtual scroll ───────────────────────────────────────────────────────────
function renderList() {
  listSpacer.style.height = (filteredPages.length * ROW_HEIGHT) + 'px';
  renderVisibleRows();
}

function renderVisibleRows() {
  var scrollTop = listContainer.scrollTop;
  var height    = listContainer.clientHeight;
  var startIdx  = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8);
  var endIdx    = Math.min(filteredPages.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 8);

  listRows.style.transform = 'translateY(' + (startIdx * ROW_HEIGHT) + 'px)';

  var frag = document.createDocumentFragment();
  for (var i = startIdx; i < endIdx; i++) {
    var page = filteredPages[i];
    var row = document.createElement('div');
    row.className = 'row' + (i === currentIndex ? ' selected' : '');
    row.dataset.idx = i;

    var pathEl = document.createElement('div');
    pathEl.className = 'row-path';
    pathEl.textContent = page.path;
    row.appendChild(pathEl);

    if (page.reviewVerdict) {
      var badge = document.createElement('span');
      badge.className = 'row-badge badge-' + page.reviewVerdict;
      badge.textContent = page.reviewVerdict[0];
      row.appendChild(badge);
    }

    var ratio = page.contentRetentionRatio;
    if (ratio !== null && ratio !== undefined) {
      var bar = document.createElement('div');
      bar.className = 'ret-bar';
      var fill = document.createElement('div');
      fill.className = 'ret-fill';
      var pct = Math.round(ratio * 100);
      fill.style.width = pct + '%';
      fill.style.background = pct > 75 ? '#10b981' : pct > 35 ? '#f59e0b' : '#ef4444';
      bar.appendChild(fill);
      row.appendChild(bar);
    }

    row.addEventListener('click', (function(idx) {
      return function() { navigateTo(idx); };
    })(i));

    frag.appendChild(row);
  }
  listRows.innerHTML = '';
  listRows.appendChild(frag);
}

listContainer.addEventListener('scroll', renderVisibleRows);

// ── Navigation ───────────────────────────────────────────────────────────────
function navigateTo(idx) {
  currentIndex = Math.max(0, Math.min(filteredPages.length - 1, idx));
  loadCurrentPage();
  scrollRowIntoView(currentIndex);
  renderVisibleRows();
}

function scrollRowIntoView(idx) {
  var top = idx * ROW_HEIGHT;
  var h   = listContainer.clientHeight;
  var cur = listContainer.scrollTop;
  if (top < cur) listContainer.scrollTop = top;
  else if (top + ROW_HEIGHT > cur + h) listContainer.scrollTop = top + ROW_HEIGHT - h;
  renderVisibleRows();
}

function loadCurrentPage() {
  var page = filteredPages[currentIndex];
  if (!page) return;

  var ratio  = page.contentRetentionRatio !== null && page.contentRetentionRatio !== undefined
               ? Math.round(page.contentRetentionRatio * 100) + '%' : 'n/a';
  var aiQ    = page.aiMigrationQuality ? '  AI: ' + page.aiMigrationQuality : '';
  el('page-info').textContent = page.path + '   (' + page.type + ', ' + ratio + aiQ + ')';

  var origSrc = '/original/' + page.path;
  var slug    = page.path.replace(/\\.html$/, '');
  var migrSrc = '/corpus/jerriais/' + slug + '/index.html';

  el('orig-label').textContent = page.path;
  el('migr-label').textContent = '/corpus/jerriais/' + slug + '/';
  el('frame-orig').src = origSrc;
  el('frame-migr').src = migrSrc;

  verdict      = page.reviewVerdict || null;
  selectedTags = {};
  (page.reviewTags || []).forEach(function(t) { selectedTags[t] = true; });
  noteText     = page.reviewNote || '';
  updateVerdictUI();
}

// ── Verdict UI ────────────────────────────────────────────────────────────────
function updateVerdictUI() {
  document.querySelectorAll('.v-btn').forEach(function(btn) {
    btn.classList.toggle('sel', btn.dataset.v === verdict);
  });
  document.querySelectorAll('.tag-chip').forEach(function(chip) {
    chip.classList.toggle('sel', !!selectedTags[chip.dataset.tag]);
  });
  el('note-input').value = noteText;
}

document.querySelectorAll('.v-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    verdict = btn.dataset.v;
    updateVerdictUI();
  });
});

document.querySelectorAll('.tag-chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    var tag = chip.dataset.tag;
    if (selectedTags[tag]) delete selectedTags[tag];
    else selectedTags[tag] = true;
    updateVerdictUI();
  });
});

el('note-input').addEventListener('input', function(e) { noteText = e.target.value; });

// ── Save & next ───────────────────────────────────────────────────────────────
function saveAndNext() {
  var page = filteredPages[currentIndex];
  if (!page) return;

  var body = {
    path: page.path,
    verdict: verdict,
    tags: Object.keys(selectedTags),
    note: noteText
  };

  fetch('/api/verdict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function(r) {
    if (!r.ok) { alert('Save failed'); return; }
    // Update in-memory record
    page.reviewVerdict = verdict;
    page.reviewTags    = Object.keys(selectedTags);
    page.reviewNote    = noteText;
    page.reviewedAt    = new Date().toISOString();

    var master = allPages.find(function(p) { return p.path === page.path; });
    if (master) {
      master.reviewVerdict = page.reviewVerdict;
      master.reviewTags    = page.reviewTags;
      master.reviewNote    = page.reviewNote;
      master.reviewedAt    = page.reviewedAt;
    }

    updateProgress();

    // Advance: remember the path after current to stay in position after re-sort
    var nextPath = filteredPages[currentIndex + 1] ? filteredPages[currentIndex + 1].path : null;
    applyFilters();
    var nextIdx = nextPath ? filteredPages.findIndex(function(p) { return p.path === nextPath; }) : -1;
    if (nextIdx >= 0) navigateTo(nextIdx);
    else if (filteredPages.length > 0) navigateTo(Math.min(currentIndex, filteredPages.length - 1));
  });
}

el('save-btn').addEventListener('click', saveAndNext);

// ── Progress ─────────────────────────────────────────────────────────────────
function updateProgress() {
  var reviewed = allPages.filter(function(p) { return !!p.reviewedAt; }).length;
  var pct = allPages.length > 0 ? Math.round(reviewed / allPages.length * 100) : 0;
  el('progress').textContent = reviewed + ' / ' + allPages.length + ' reviewed (' + pct + '%)';
}

// ── Controls ──────────────────────────────────────────────────────────────────
el('btn-prev').addEventListener('click', function() { navigateTo(currentIndex - 1); });
el('btn-next').addEventListener('click', function() { navigateTo(currentIndex + 1); });

el('queue-toggle').addEventListener('click', function() {
  queueMode = !queueMode;
  el('queue-toggle').classList.toggle('active', queueMode);
  el('queue-toggle').textContent = queueMode ? 'Queue mode' : 'Alpha mode';
  applyFilters();
});

el('review-filters').addEventListener('click', function(e) {
  var chip = e.target.closest('[data-rf]');
  if (!chip) return;
  reviewFilter = chip.dataset.rf;
  document.querySelectorAll('[data-rf]').forEach(function(c) {
    c.classList.toggle('active', c.dataset.rf === reviewFilter);
  });
  applyFilters();
});

el('search').addEventListener('input', function(e) {
  searchText = e.target.value;
  applyFilters();
});

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  var inInput = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA';
  if (inInput) {
    if (e.key === 'Enter') { saveAndNext(); e.preventDefault(); }
    return;
  }
  switch (e.key) {
    case 'ArrowRight': case ']': navigateTo(currentIndex + 1); e.preventDefault(); break;
    case 'ArrowLeft':  case '[': navigateTo(currentIndex - 1); e.preventDefault(); break;
    case '1': verdict = 'GOOD';    updateVerdictUI(); break;
    case '2': verdict = 'PARTIAL'; updateVerdictUI(); break;
    case '3': verdict = 'BROKEN';  updateVerdictUI(); break;
    case '4': verdict = 'SKIP';    updateVerdictUI(); break;
    case 'Enter': saveAndNext(); e.preventDefault(); break;
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
loadPages();

})();
</script>
</body>
</html>`;
}

// ── Entry point ───────────────────────────────────────────────────────────────

(async () => {
  loadRecords();
  const reviewed = records.filter((r) => r.reviewedAt).length;

  const server = http.createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`\nReview tool running at http://localhost:${PORT}`);
    console.log(
      `${records.length} pages loaded (${reviewed} already reviewed)\n`
    );
    console.log("Keyboard shortcuts:");
    console.log("  1 = GOOD   2 = PARTIAL   3 = BROKEN   4 = SKIP");
    console.log("  → / ]  next page    ← / [  previous page");
    console.log("  Enter  save & advance");
  });
})();
