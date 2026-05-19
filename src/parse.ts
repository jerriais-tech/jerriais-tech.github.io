import * as cheerio from "cheerio";
import TurndownService from "turndown";
// @ts-ignore
import { tables } from "@joplin/turndown-plugin-gfm";

const turndownService = new TurndownService();
turndownService.use([tables]);
turndownService.keep(function (node, _options) {
  return (
    node.nodeName === "A" &&
    Boolean(node.getAttribute("name")) &&
    !Boolean(node.getAttribute("href"))
  );
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
  // Strategy 1: font[size="2"]` containing a list of links.
  // Note: HTML parsers often hoist <ul> out of inline <font> (block-in-inline
  // mismatch), leaving <li> elements as direct children of the font element.
  // We check for <li> (not <ul> or bare <a>) to distinguish viyiz link lists
  // from author-attribution spans that also use font[size="2"] with one link.
  const $font2 = (body as cheerio.Cheerio<any>)
    .find('font[size="2"]')
    .filter((_i, el) => $(el).find("li").length > 0)
    .first();
  if ($font2.length > 0) {
    return { toRemove: [$font2], $links: $font2.find("a") };
  }

  // Strategy 2: element with text "Viyiz étout" followed by a <ul>
  const VIYIZ_RE = /^viyiz.*[e\u00e9]tout/i;
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
function rewriteHref(href: string, rewriteRelativeUrls: boolean): string {
  const url = new URL(href, "http://example.com");
  const isRelative =
    url.origin === new URL("http://example.com").origin;
  if (!isRelative) return href;

  href = href.replace(/\.html/, "/");
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
  rewriteRelativeUrls: boolean
) {
  const links = element.find("a");
  links.each((_i, el) => {
    let href = el.attribs.href ?? el.attribs.HREF;
    if (href) {
      const url = new URL(href, "http://example.com");
      const isRelative = url.origin === new URL("http://example.com").origin;
      if (isRelative) {
        href = href.replace(/\.html/, "/");
        const isRootRelative = href.startsWith("/");
        const isPageRelative = href.startsWith("#");
        if (rewriteRelativeUrls && !isRootRelative && !isPageRelative) {
          href = `../${href}`;
        }
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

function parseContent($: cheerio.CheerioAPI, rewriteRelativeUrls: boolean) {
  const body = $("body").clone();

  const section = findViyizSection($, body);
  if (section) {
    section.toRemove.forEach((el) => el.remove());
  }
  const back = body.find('a[href="../jerriais.html"]');
  back.remove();
  const title = body.find('font[color="#215e21"] h2');
  title.remove();

  parseLinks(body, rewriteRelativeUrls);
  if (rewriteRelativeUrls) {
    parseImages(body);
  }

  return body.html() ?? "";
}

function parseRelated($: cheerio.CheerioAPI, rewriteRelativeUrls: boolean) {
  const body = $("body").clone();
  const section = findViyizSection($, body);
  if (!section) return [];

  return section.$links
    .toArray()
    .map((el) => {
      const href = el.attribs.href ?? el.attribs.HREF;
      if (!href) return null;
      return { url: rewriteHref(href, rewriteRelativeUrls), text: $(el).text() };
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

function findAuthor($: cheerio.CheerioAPI): [string, string] | undefined {
  const body = $("body").clone();
  const section = findViyizSection($, body);
  if (section) {
    section.toRemove.forEach((el) => el.remove());
  }
  const links = body.find("a[href]").toArray();

  return Object.entries(AUTHORS).reduce(
    (found, [slug, name]) => {
      if (found) {
        return found;
      }
      if (links.some((element) => element.attribs.href === `${slug}.html`)) {
        return [slug, name];
      }
    },
    undefined as [string, string] | undefined
  );
}

export function parseFile(
  file: Buffer,
  options: {
    rewriteRelativeUrls: boolean;
  }
): {
  content: string;
  data: Record<string, any>;
} {
  const $ = cheerio.load(file);
  const title = $("title").text();
  const [authorSlug, author] = findAuthor($) ?? [,];
  const content = parseContent($, options.rewriteRelativeUrls);
  const related = parseRelated($, options.rewriteRelativeUrls);

  return {
    content: renderMarkdown(content),
    data: {
      title,
      author,
      authorSlug,
      related,
    },
  };
}
