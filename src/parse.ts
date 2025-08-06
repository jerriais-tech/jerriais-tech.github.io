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

function getViyizEtout(element: cheerio.Cheerio<any>): cheerio.Cheerio<any> {
  return element.find('font[size="2"]');
}

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

  const viyizEtout = getViyizEtout(body);
  viyizEtout.remove();
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
  const viyizEtout = getViyizEtout(body);
  parseLinks(viyizEtout, rewriteRelativeUrls);
  return viyizEtout
    .find("a")
    .toArray()
    .map((el) => {
      const $el = $(el);
      return { url: $el.attr("href"), text: $el.text() };
    })
    .filter((link): link is { url: string; text: string } => Boolean(link.url));
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
  getViyizEtout(body).remove();
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
