import "tsx/esm";
import { renderToStaticMarkup } from "react-dom/server";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const eleventyLesPageJerriaisesPlugin = (
  await import("./src/eleventy-lespages")
).default;

/** @param {import("@11ty/eleventy/src/UserConfig")} eleventyConfig */
export default async function (eleventyConfig) {
  eleventyConfig.setQuietMode(true);
  eleventyConfig.setUseGitIgnore(false);

  eleventyConfig.setInputDirectory("content");
  eleventyConfig.setLayoutsDirectory("../layouts");

  eleventyConfig.addPassthroughCopy({ "content/pronunciation.js": "pronunciation.js" });
  eleventyConfig.addPassthroughCopy({ "CNAME": "CNAME" });

  // Utility: strip diacritics and uppercase for normalised sort/grouping
  const normalise = (s) =>
    (s ?? "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();

  // A–Z letter groups sorted by normalised title (A–Z only; other characters excluded)
  eleventyConfig.addCollection("corpusByLetter", (api) => {
    const pages = api
      .getFilteredByTag("jerriais")
      .sort((a, b) =>
        normalise(a.data.title).localeCompare(normalise(b.data.title))
      );
    const map = new Map();
    for (const page of pages) {
      const ch = normalise(page.data.title).charAt(0);
      if (ch < "A" || ch > "Z") continue; // only A–Z
      if (!map.has(ch)) map.set(ch, []);
      map.get(ch).push(page);
    }
    return [...map.entries()].map(([letter, pages]) => ({ letter, pages }));
  });

  // Author list for pagination over author pages
  eleventyConfig.addCollection("corpusAuthorList", (api) =>
    Object.values(
      api.getFilteredByTag("jerriais").reduce((acc, page) => {
        const { author, authorSlug } = page.data;
        if (!authorSlug) return acc;
        if (!acc[authorSlug]) acc[authorSlug] = { slug: authorSlug, name: author, pages: [] };
        acc[authorSlug].pages.push(page);
        return acc;
      }, {})
    ).sort((a, b) => a.name.localeCompare(b.name))
  );

  // Author map for O(1) sidebar lookup
  eleventyConfig.addCollection("corpusAuthorMap", (api) =>
    api.getFilteredByTag("jerriais").reduce((acc, page) => {
      const { authorSlug } = page.data;
      if (authorSlug) {
        if (!acc[authorSlug]) acc[authorSlug] = [];
        acc[authorSlug].push(page);
      }
      return acc;
    }, {})
  );

  // Topics with ≥5 pages, each with a URL slug.
  // Topics are grouped by slug (case-insensitive) to avoid duplicate permalinks.
  eleventyConfig.addCollection("corpusTopicList", (api) => {
    const bySlug = {};
    for (const page of api.getFilteredByTag("jerriais")) {
      for (const topic of page.data.topics ?? []) {
        const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        if (!bySlug[slug]) bySlug[slug] = { topic, slug, pages: [] };
        bySlug[slug].pages.push(page);
      }
    }
    return Object.values(bySlug)
      .filter((t) => t.pages.length >= 5)
      .sort((a, b) => a.topic.localeCompare(b.topic));
  });

  // Topic → slug map for O(1) sidebar pill rendering
  eleventyConfig.addCollection("corpusTopicMap", (api) => {
    const map = {};
    for (const page of api.getFilteredByTag("jerriais")) {
      for (const topic of page.data.topics ?? []) {
        if (!map[topic])
          map[topic] = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      }
    }
    return map;
  });

  await eleventyConfig.addPlugin(eleventyLesPageJerriaisesPlugin, {
    ignore: [
      "0",
      "verbconj.html",
      "verbconj2.html",
      "verbconj3.html",
      "auteurs.html",
      "auteurs2.html",
    ],
    layout: "lespages.11ty.tsx",
  });

  eleventyConfig.addTemplateFormats("11ty.tsx");
  eleventyConfig.addExtension(["11ty.tsx"], {
    key: "11ty.js",
    compile: function () {
      return async function (data) {
        let content = await this.defaultRenderer(data);
        return `<!DOCTYPE html>${renderToStaticMarkup(content)}`;
      };
    },
  });

  eleventyConfig.addTemplateFormats("css");

  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function (inputContent, inputPath) {
      return async (data) => {
        const result = await postcss([tailwindcss()]).process(inputContent, {
          from: inputPath,
          to: data.page.outputPath,
        });

        return result.css;
      };
    },
  });
}
