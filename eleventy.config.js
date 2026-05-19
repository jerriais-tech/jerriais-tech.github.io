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

  eleventyConfig.addPassthroughCopy("pronunciation.js");

  await eleventyConfig.addPlugin(eleventyLesPageJerriaisesPlugin, {
    ignore: [
      "0",
      "verbconj.html",
      "verbconj2.html",
      "verbconj3.html",
      "index.html",
      "assembliee.html",
      "noue.html",
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
