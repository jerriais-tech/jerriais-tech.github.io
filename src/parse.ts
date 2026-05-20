import * as cheerio from "cheerio";
import TurndownService from "turndown";
// @ts-ignore
import { tables } from "@joplin/turndown-plugin-gfm";

/** Decode an HTML file buffer as UTF-8; fall back to ISO-8859-1 if the bytes
 *  are not valid UTF-8.  879 of the 7,379 source files are latin1-encoded
 *  without a charset declaration, so cheerio.load(Buffer) would garble them. */
function decodeHtmlBuffer(buf: Buffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buf);
  }
}

const turndownService = new TurndownService();
turndownService.use([tables]);
turndownService.keep(function (node, _options) {
  return (
    node.nodeName === "A" &&
    Boolean(node.getAttribute("name")) &&
    !Boolean(node.getAttribute("href"))
  );
});
// Preserve pronunciation links as raw HTML so their class/href survive
// markdown conversion. (turndownService.keep() has a scoping issue in
// Node.js that prevents function filters from firing; addRule works correctly.)
turndownService.addRule("pronunciation", {
  filter: (node) =>
    node.nodeName === "A" && node.getAttribute("class") === "pronunciation",
  replacement: (_content, node) => (node as any).outerHTML ?? _content,
});
turndownService.addRule("emphasis", {
  filter: ["em", "i"],
  replacement: (content) =>
    content
      .split("\n")
      .map((line) => line.trim() && `*${line.trim()}*`)
      .filter(Boolean)
      .join("<br>"),
});
turndownService.addRule("bold", {
  filter: ["b", "strong"],
  replacement: (content) =>
    content
      .split("\n")
      .map((line) => line.trim() && `**${line.trim()}**`)
      .filter(Boolean)
      .join("<br>"),
});

// ── Viyiz étout detection ──────────────────────────────────────────────────

interface ViyizSection {
  toRemove: cheerio.Cheerio<cheerio.AnyNode>[];
  $links: cheerio.Cheerio<cheerio.AnyNode>;
}

/**
 * Locates the "Viyiz étout" (see-also) section in the page body.
 *
 * Two strategies, tried in order:
 *
 * 1. `<font size="2">` containing a `<ul>` with `<a>` links — the original
 *    site's main pattern. Only the font blocks that actually contain a link
 *    list are matched; font blocks used for styled body text are left alone.
 *
 * 2. An element whose text starts with "Viyiz" (and contains "étout")
 *    followed by a `<ul>` with links — covers the 27 pages that use a bare
 *    `<i>Viyiz étout:</i>` without a font wrapper.
 */
function findViyizSection(
  $: cheerio.CheerioAPI,
  body: cheerio.Cheerio<cheerio.AnyNode>
): ViyizSection | null {
  // Strategy 1: font[size="2"] containing a list of links.
  // Note: HTML parsers often hoist <ul> out of inline <font> (block-in-inline
  // mismatch). Two sub-cases:
  //   (a) <ul> stays inside <font> → <li> elements are descendants of the font.
  //   (b) <ul> is hoisted outside — the font ends up inside the <ul>, giving a
  //       structure like: body > p > font (label) + body > ul > font (list).
  //       In this case we must also remove the <ul> wrapper and the label <p>.
  const VIYIZ_RE = /^viyiz.*[e\u00e9]tout/i;
  const $font2 = (body as cheerio.Cheerio<any>)
    .find('font[size="2"]')
    .filter((_i, el) => $(el).find("li").length > 0)
    .first();
  if ($font2.length > 0) {
    const toRemove: cheerio.Cheerio<cheerio.AnyNode>[] = [];
    // If the font is nested inside a <ul> (hoisted case), remove the whole <ul>
    const $listContainer: cheerio.Cheerio<any> = ($font2.parent() as cheerio.Cheerio<any>).is("ul")
      ? ($font2.parent() as cheerio.Cheerio<any>)
      : $font2;
    toRemove.push($listContainer);
    // Look backwards from the list container for a "Viyiz étout" label element
    let $prev = $listContainer.prev() as cheerio.Cheerio<any>;
    while ($prev.length > 0) {
      if (VIYIZ_RE.test($prev.text().trim())) {
        toRemove.unshift($prev);
        break;
      }
      $prev = $prev.prev() as cheerio.Cheerio<any>;
    }
    return { toRemove, $links: $font2.find("a") };
  }

  // Strategy 2: element with text "Viyiz étout" followed by a <ul>
  const candidates = (body as cheerio.Cheerio<any>)
    .find("i, em, b, strong, p, div, span, td")
    .toArray();

  for (const el of candidates) {
    const $el = $(el) as cheerio.Cheerio<any>;
    if (!VIYIZ_RE.test($el.text().trim())) continue;

    // Look for a following <ul> with links — try increasingly wide searches
    const searches: Array<[cheerio.Cheerio<any>, cheerio.Cheerio<any>]> = [
      [$el, $el.next("ul")],
      [$el, $el.nextAll("ul").first()],
      [$el.parent() as cheerio.Cheerio<any>, ($el.parent() as cheerio.Cheerio<any>).next("ul")],
      [$el.parent() as cheerio.Cheerio<any>, ($el.parent() as cheerio.Cheerio<any>).nextAll("ul").first()],
    ];

    for (const [$label, $ul] of searches) {
      if ($ul.length > 0 && $ul.find("a").length > 0) {
        return { toRemove: [$label, $ul], $links: $ul.find("a") };
      }
    }
  }

  return null;
}

/** Rewrites a single href value using the same rules as parseLinks. */
function rewriteHref(href: string, rewriteRelativeUrls: boolean, clashRemap?: Record<string, string>): string {
  const url = new URL(href, "http://example.com");
  const isRelative =
    url.origin === new URL("http://example.com").origin;
  if (!isRelative) return href;

  if (clashRemap) {
    // Apply clash remap for bare stems (no intermediate directory component).
    // "noue.html" → "noue-page/", but "assembliee/index.html" stays as-is.
    href = href.replace(/^([^/]+)\.html([^/]*)$/, (_, stem, rest) =>
      `${clashRemap[stem] ?? stem}/${rest}`
    );
    if (href.includes(".html")) {
      href = href.replace(/\.html/, "/");
    }
  } else {
    href = href.replace(/\.html/, "/");
  }
  const isRootRelative = href.startsWith("/");
  const isPageRelative = href.startsWith("#");
  if (rewriteRelativeUrls && !isRootRelative && !isPageRelative) {
    href = `../${href}`;
  }
  return href;
}

// ── Link / image rewriting ─────────────────────────────────────────────────

function parseLinks(
  element: cheerio.Cheerio<any>,
  rewriteRelativeUrls: boolean,
  clashRemap?: Record<string, string>
) {
  const links = element.find("a");
  links.each((_i, el) => {
    let href = el.attribs.href ?? el.attribs.HREF;
    if (href) {
      const url = new URL(href, "http://example.com");
      const isRelative = url.origin === new URL("http://example.com").origin;
      if (isRelative) {
        href = rewriteHref(href, rewriteRelativeUrls, clashRemap);
        el.attribs.HREF = "";
        el.attribs.href = href;
      }
    }
  });
}

function parseImages(element: cheerio.Cheerio<any>) {
  const images = element.find("img");
  images.each((_i, el) => {
    let src = el.attribs.src ?? el.attribs.SRC;
    if (src) {
      const url = new URL(src, "http://example.com");
      const isRelative = url.origin === new URL("http://example.com").origin;
      const isRootRelative = src.startsWith("/");
      if (isRelative && !isRootRelative) {
        src = `../${src}`;
        el.attribs.SRC = "";
        el.attribs.src = src;
      }
    }
  });
}

// ── Pronunciation player ───────────────────────────────────────────────────

const AUDIO_HREF_RE = /\.(wav|mp3)$/i;
const ECOUTE_SRC_RE = /ecoute\.jpg$/i;

/** Rewrite <a href="*.wav|*.mp3"><img src="ecoute.jpg"> [label]</a> as
 *  <a class="pronunciation" href="…"> for progressive enhancement:
 *  without JS the link opens/plays the audio file; with JS the click handler
 *  in pronunciation.js intercepts and plays inline via Audio().
 *  Must be called AFTER parseLinks() and parseImages() so hrefs/srcs are
 *  already rewritten. */
function parsePronunciation(
  $root: cheerio.CheerioAPI,
  element: cheerio.Cheerio<any>
) {
  element.find("a").each((_i, el) => {
    const href = el.attribs.href ?? el.attribs.HREF ?? "";
    if (!AUDIO_HREF_RE.test(href)) return;

    const $a = $root(el);
    const img = $a.find("img, IMG").first();
    if (!img.length) return;
    const imgSrc = img.attr("src") ?? img.attr("SRC") ?? "";
    if (!ECOUTE_SRC_RE.test(imgSrc)) return;

    // Scrub decorative alt; strip layout attributes left over from old HTML
    img.attr("alt", "");
    img.removeAttr("align");
    img.removeAttr("ALIGN");

    // Collect any text label from text nodes inside the <a>
    const label = $a
      .contents()
      .toArray()
      .filter((n) => n.type === "text")
      .map((n) => ((n as any).data ?? "").trim())
      .filter(Boolean)
      .join(" ");

    $a.replaceWith(
      `<a class="pronunciation" href="${href}" aria-label="Ouï la prononciation">` +
        $root.html(img[0] as any) +
        (label ? ` ${label}` : "") +
        `</a>`
    );
  });
}

function parseContent($: cheerio.CheerioAPI, rewriteRelativeUrls: boolean, clashRemap?: Record<string, string>) {
  const body = $("body").clone();

  const section = findViyizSection($, body);
  if (section) {
    section.toRemove.forEach((el) => el.remove());
  }
  // Remove back-to-home nav links (the banner image linking to ../jerriais.html).
  // Use :has(img) to avoid removing inline text mentions of "Jèrriais" that
  // happen to also link to that page (e.g. "L'astronomie en Jèrriais").
  const back = body.find('a[href="../jerriais.html"]:has(img)');
  back.remove();
  const title = body.find('font[color="#215e21"] h2');
  title.remove();

  parseLinks(body, rewriteRelativeUrls, clashRemap);
  if (rewriteRelativeUrls) {
    parseImages(body);
  }
  parsePronunciation($, body);

  return body.html() ?? "";
}

function parseRelated($: cheerio.CheerioAPI, rewriteRelativeUrls: boolean, clashRemap?: Record<string, string>) {
  const body = $("body").clone();
  const section = findViyizSection($, body);
  if (!section) return [];

  return section.$links
    .toArray()
    .map((el) => {
      const href = el.attribs.href ?? el.attribs.HREF;
      if (!href) return null;
      return { url: rewriteHref(href, rewriteRelativeUrls, clashRemap), text: $(el).text() };
    })
    .filter((link): link is { url: string; text: string } => Boolean(link?.url));
}

function renderMarkdown(content: string) {
  return turndownService.turndown(content);
}

export const AUTHORS = {
  legeyt: "Matthieu Le Geyt",
  bott: "Nicholas Bott",
  lehardy: "Esther Le Hardy",
  sullivan: "Jean Sullivan",
  langlois: "Philippe Langlois",
  manuel: "Henri Luce Manuel",
  flip: "Philippe Asplet",
  marett: "Robert Pipon Marett",
  jdr: "Jean Dorey",
  jeromedelile: "Jérôme de l'Ile",
  letouzel: "Le Touzel",
  letouzel2: "James Charles Le Touzel",
  legros: "Augustus Asplet Le Gros",
  charlespicot: "Charles Picot",
  lock: "John Lock",
  amesservy: "Alfred Messervy",
  picot: "Jean Picot",
  georgie: "Mathilde de Faye",
  brambilo: "Philippe Le Sueur Mourant",
  livonia: "Alice de Faye",
  maugi: "John Mauger",
  gwdec: "G. W. de Carteret",
  lebrocq: "Ed. Le Brocq",
  ejluce: "E. J. Luce",
  pwluce: "P. W. Luce",
  lefeuvre: "George F. Le Feuvre",
  leruez: "S.P. Le Ruez",
  hacquoil: "Florence Mary Hacquoil",
  lemaistre: "Fraînque Lé Maistre",
  delamare: "Sir Arthur de la Mare",
  eileenlesueur: "Eileen Le Sueur",
  perchard: "Amelia Perchard",
  joantapley: "Joan Tapley",
  jerpoem: "Geraint Jennings",
};

interface AuthorResult {
  slug: string;
  name: string;
  /** True when 2+ distinct known authors each score ≥ 3 (italic/par context),
   *  suggesting the page may have multiple attributed authors or that one
   *  high-scoring link is actually a subject reference (elegy, acrostic, etc.).
   *  Surfaces the page in the manual review queue. */
  multiAuthorSuspected: boolean;
}

function findAuthor($: cheerio.CheerioAPI): AuthorResult | undefined {
  const body = $("body").clone();
  const section = findViyizSection($, body);
  if (section) {
    section.toRemove.forEach((el) => el.remove());
  }

  // Serialise the cleaned body once for positional and context analysis.
  const bodyHtml = body.html() ?? "";
  const bodyLen = bodyHtml.length || 1;

  // Collect candidates: one entry per unique author slug, keeping the last
  // (highest document position) occurrence of each.
  const candidates = new Map<string, { name: string; score: number; pos: number }>();

  body.find("a[href]").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    const slug = href.replace(/\.html$/, "");
    const name = AUTHORS[slug as keyof typeof AUTHORS];
    if (!name) return;

    // Locate this href in the serialised HTML to derive position and context.
    // Use lastIndexOf so that if there are multiple identical hrefs, we score
    // against the last occurrence (attribution style).
    const pos = bodyHtml.lastIndexOf(`href="${href}"`);

    // ── Signal 1: inside <i> or <em> ──────────────────────────────────────
    const inItalic = $(el).closest("i, em").length > 0;

    // ── Signal 2: preceded by "par" (tag-stripped) ────────────────────────
    const before = bodyHtml.slice(Math.max(0, pos - 60), pos);
    const beforeText = before.replace(/<[^>]+>/g, "").trimEnd();
    const parPrefix = /[Pp]ar\s*$/.test(beforeText);

    // ── Signal 3: date within 80 chars after the link ─────────────────────
    const after = bodyHtml.slice(pos, pos + 80);
    const hasDate = DATE_RE.test(after) || /\b(?:19|20)\d{2}\b/.test(after);

    // ── Signal 4: position in document ────────────────────────────────────
    const relPos = pos / bodyLen;
    const posScore = relPos > 0.75 ? 2 : relPos > 0.5 ? 1 : 0;

    const score =
      (inItalic ? 3 : 0) +
      (parPrefix ? 3 : 0) +
      (hasDate ? 2 : 0) +
      posScore;

    // Keep the entry with the higher score; ties keep the later position.
    const existing = candidates.get(slug);
    if (!existing || score > existing.score || (score === existing.score && pos > existing.pos)) {
      candidates.set(slug, { name, score, pos });
    }
  });

  if (candidates.size === 0) return undefined;

  // Sort by score descending, then position descending (last in doc wins ties).
  const sorted = [...candidates.entries()].sort(
    ([, a], [, b]) => b.score - a.score || b.pos - a.pos
  );

  const [winnerSlug, winner] = sorted[0];

  // Flag when 2+ distinct slugs each score ≥ 3 — probable multi-author or
  // subject-link false positive.
  const highScorers = sorted.filter(([, c]) => c.score >= 3);
  const multiAuthorSuspected = highScorers.length >= 2;

  return { slug: winnerSlug, name: winner.name, multiAuthorSuspected };
}

// ── Keyword/tag extraction ─────────────────────────────────────────────────

const KEYWORDS_STOPLIST = new Set([
  "jèrriais",
  "jerriais",
  "jersey language",
  "langue jersiaise",
  "language",
  "langue",
  "channel islands",
  "îles anglo-normandes",
  "iles anglo-normandes",
  "normandie",
  "normandy",
  "jersey",
  "hot potatoes",
  "half-baked software",
  "windows",
  "university of victoria",
]);

function extractTags($: cheerio.CheerioAPI): string[] {
  const content = $('meta[name="keywords" i]').attr("content");
  if (!content) return [];
  return content
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !KEYWORDS_STOPLIST.has(t.toLowerCase()));
}

// ── Attribution date + source extraction ──────────────────────────────────

const DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})\b/;

/** Returns an ISO YYYY-MM-DD string plus an ambiguity flag, or undefined if
 *  values are out of calendar range (guards against tag-boundary artifacts).
 *  Two-digit years use a pivot: ≤ 30 → 20xx, > 30 → 19xx. */
function isoDate(
  day: string,
  month: string,
  year: string
): { date: string; yearAmbiguous: boolean } | undefined {
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  let y = parseInt(year, 10);
  const yearAmbiguous = year.length === 2;
  if (yearAmbiguous) y = y <= 30 ? 2000 + y : 1900 + y;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1000) return undefined;
  return {
    date: `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`,
    yearAmbiguous,
  };
}

interface AttributionDate {
  date: string; // ISO YYYY-MM-DD
  source?: string;
  dateYearAmbiguous: boolean; // true when year was 2 digits (century inferred)
}

/** Finds the last top-level <i>/<em> in the body (after viyiz removal) that
 *  contains a date pattern, then extracts the date and any publication source
 *  (newspaper / journal name) from the same line as the date. */
function extractAttributionDate(
  $: cheerio.CheerioAPI
): AttributionDate | undefined {
  const body = $("body").clone();
  const section = findViyizSection($, body);
  if (section) {
    section.toRemove.forEach((el) => el.remove());
  }

  let lastEl: cheerio.Cheerio<cheerio.AnyNode> | undefined;

  // Only consider top-level italic elements (not nested inside another i/em).
  body
    .find("i, em")
    .filter((_i, el) => $(el).parents("i, em").length === 0)
    .each((_i, el) => {
      const $el = $(el);
      if (DATE_RE.test($el.text())) {
        lastEl = $el; // keep updating — last match wins
      }
    });

  if (!lastEl) return undefined;

  const dateMatch = DATE_RE.exec(lastEl.text());
  if (!dateMatch) return undefined;

  const dateResult = isoDate(dateMatch[1], dateMatch[2], dateMatch[3]);
  if (!dateResult) return undefined; // out-of-range (e.g. tag-boundary artifact)
  const { date, yearAmbiguous } = dateResult;

  // Derive source: normalise the element's HTML to plain lines, find the line
  // that holds the date, strip the date and any noise words from that line.
  const lines = (lastEl.html() ?? "")
    .replace(/<br\s*\/?>/gi, "\n") // treat <br> as line break
    .replace(/<a[^>]*>.*?<\/a>/gsi, "") // strip author links
    .replace(/<[^>]+>/g, "") // strip remaining tags
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const dateLine = lines.find((l) => DATE_RE.test(l));
  if (!dateLine) return { date, source: undefined, dateYearAmbiguous: yearAmbiguous };

  const sourceText = dateLine
    .replace(DATE_RE, "")
    .replace(/\([^)]*\)/g, "") // remove parentheticals like (èrveue ...)
    .replace(/\b[Pp]ar\b/g, "")
    .replace(/\bm[iî]s?\s*[àa]\s*jour\b/gi, "")
    .replace(/\b[eè]rveu[eé]?\b/gi, "")
    .replace(/[,;:\s]+/g, " ")
    .trim();

  return {
    date,
    source: sourceText.length >= 2 ? sourceText : undefined,
    dateYearAmbiguous: yearAmbiguous,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Extract all relative internal link slugs from the body content of a page,
 *  excluding the back-to-home banner, the Viyiz étout section, and anchors. */
export function extractInlineLinks(file: Buffer): string[] {
  const $ = cheerio.load(decodeHtmlBuffer(file));
  const body = $("body").clone() as cheerio.Cheerio<any>;

  // Remove the viyiz section (those are captured separately as "related")
  const section = findViyizSection($, body);
  if (section) section.toRemove.forEach((el) => el.remove());

  // Remove back-to-home nav banner links
  body.find('a[href="../jerriais.html"]:has(img)').remove();

  const slugs: string[] = [];
  body.find("a[href], a[HREF]").each((_i, el) => {
    const href = el.attribs.href ?? el.attribs.HREF ?? "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    const url = new URL(href, "http://example.com");
    if (url.origin !== new URL("http://example.com").origin) return; // external
    const pathname = url.pathname.replace(/\.html$/, "").replace(/\/$/, "");
    if (!pathname || pathname === "." || pathname.includes("..")) return;
    slugs.push(pathname);
  });
  return [...new Set(slugs)];
}

export function parseFile(
  file: Buffer,
  options: {
    rewriteRelativeUrls: boolean;
    clashRemap?: Record<string, string>;
  }
): {
  content: string;
  data: Record<string, any>;
} {
  const $ = cheerio.load(decodeHtmlBuffer(file));
  const title = $("title").text();
  const authorResult = findAuthor($);
  const content = parseContent($, options.rewriteRelativeUrls, options.clashRemap);
  const related = parseRelated($, options.rewriteRelativeUrls, options.clashRemap);
  const topics = extractTags($);
  const attribution = extractAttributionDate($);

  return {
    content: renderMarkdown(content),
    data: {
      title,
      author: authorResult?.name,
      authorSlug: authorResult?.slug,
      multiAuthorSuspected: authorResult?.multiAuthorSuspected ?? false,
      related,
      topics,
      date: attribution?.date,
      source: attribution?.source,
      dateYearAmbiguous: attribution?.dateYearAmbiguous ?? false,
    },
  };
}
