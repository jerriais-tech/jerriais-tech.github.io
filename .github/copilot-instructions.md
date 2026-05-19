# Copilot Instructions

This is the Jèrriais Tech website — a static site that also archives and presents Les Pages Jèrriaises, a large collection of Jèrriais-language documents originally published as a frameset-based HTML site since the late 1990s.

## Commands

```bash
npm start          # Dev server (eleventy --serve)
npm run build      # Build static site to _site/
npm run pages      # One-off: convert Les Pages HTML archive to markdown in content/
```

There are no tests configured.

The deploy workflow (`deploy.yml`) publishes `_site/corpus` (not the whole `_site/`) to GitHub Pages.

## Architecture

The project has two distinct parts:

### Main site
- `content/index.11ty.tsx` — the single homepage, written as a React component
- `layouts/` — shared React layout components (`Layout.tsx`, `Content.tsx`, etc.)
- `content/index.css` — Tailwind CSS entry point, compiled via PostCSS inside Eleventy

### Les Pages Jèrriaises corpus
- `lespages/members.societe-jersiaise.org/geraint/` — the raw HTML archive (must be present locally for build)
- `src/eleventy-lespages.ts` — Eleventy plugin that reads the archive at build time, parses each HTML page into markdown + frontmatter, and registers virtual templates via `eleventyConfig.addTemplate()`
- `src/parse.ts` — parses legacy HTML using cheerio and converts to markdown using turndown; extracts title, author, and "Viyiz étout" (see-also) links
- `src/worker.ts` — runs in forked child processes; `src/worker.js` is the ESM bootstrap that loads it via `tsx/esm`
- `src/WorkerPool.ts` — forks 8 child processes and distributes file-processing work across them

The `import` CLI (`src/import.ts`) is a standalone tool for exporting pages to `.md` files on disk, not part of the normal build.

### Eleventy configuration (`eleventy.config.js`)
- Input: `content/`, layouts: `layouts/` (one level up from input)
- `.11ty.tsx` templates are compiled with `renderToStaticMarkup` — **React is server-side only**
- CSS files are compiled as Eleventy templates using PostCSS + Tailwind
- The Les Pages plugin is registered with an `ignore` list of problematic files (verb conjugation pages, the frameset index, etc.)

## Key Conventions

### No client-side React
React components render to static HTML at build time. There is no React runtime in the browser. Any interactivity must be vanilla JS, injected via `dangerouslySetInnerHTML={{ __html: script }}` on a `<script>` tag (see `content/index.11ty.tsx` for the contact form example).

### Template format
Eleventy templates use `.11ty.tsx` extension. Layout files export a React functional component as default. Page templates export a `render(data)` function that returns JSX.

### Author detection
`src/parse.ts` maintains a hardcoded `AUTHORS` map of URL slugs → full names. An author is attributed to a page if the page body contains an `<a href="{slug}.html">` link. This is flaky by design — the metadata extraction is known to sometimes misattribute.

### URL rewriting
During HTML parsing, relative `.html` links are rewritten to trailing-slash URLs (`foo.html` → `foo/`). Non-root-relative links get a `../` prefix added. The main archive is served under `/corpus/jerriais/`.

### Ignored files
Files in the `ignore` list in `eleventy.config.js` are skipped by the Eleventy plugin (interactive games, the main frameset index page, and files where the `jerriais.html` → `jerriais/index.html` URL migration causes issues).
