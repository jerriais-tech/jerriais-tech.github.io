import * as fs from "fs";
import * as path from "path";
import { LesPagePluginOptions } from "./types";

import WorkerPool from "./WorkerPool";

const assetDir = "lespages/members.societe-jersiaise.org/geraint";
const dir = "lespages/members.societe-jersiaise.org/geraint/jerriais";

/** Compute a map of clashing HTML stems → replacement slugs.
 *  Type A: foo.html exists at top level AND foo/ subdir also exists.
 *  Type B: index.html and {dirName}.html both exist in the same directory. */
function computeClashMap(dirPath: string): Record<string, string> {
  const clashMap: Record<string, string> = {};
  const entries = fs.readdirSync(dirPath);

  const htmlStems = new Set(
    entries.filter((f) => f.endsWith(".html")).map((f) => path.parse(f).name)
  );
  const subdirs = new Set(
    entries.filter((f) => fs.lstatSync(path.join(dirPath, f)).isDirectory())
  );

  // Type A: top-level foo.html clashes with foo/index.html
  for (const stem of htmlStems) {
    if (subdirs.has(stem)) {
      clashMap[stem] = `${stem}-page`;
    }
  }

  // Type B: index.html clashes with {dirName}.html (both are treated as dir index)
  const dirName = path.basename(dirPath);
  if (htmlStems.has("index") && htmlStems.has(dirName)) {
    clashMap["index"] = "index-page";
  }

  return clashMap;
}

async function eleventyLesPagesJerriaisesPlugin(
  eleventyConfig: Record<string, any>,
  options: LesPagePluginOptions
) {
  const outdir = eleventyConfig.directories.output;
  const { ignore, layout } = options;

  const clashRemap = computeClashMap(dir);

  const assets = fs.globSync(path.join(assetDir, "**/*")).filter((infile) => {
    return (
      !fs.lstatSync(infile).isDirectory() &&
      !ignore.includes(path.relative(dir, infile)) &&
      path.parse(infile).ext !== ".html"
    );
  });

  const pages = fs.globSync(path.join(dir, "**/*")).filter((infile) => {
    return (
      !fs.lstatSync(infile).isDirectory() &&
      !ignore.includes(path.relative(dir, infile)) &&
      path.parse(infile).ext === ".html"
    );
  });

  const workerPool = new WorkerPool();

  // Copy assets to output folder
  await Promise.all(
    assets.map((infile) =>
      workerPool.processFile({ infile, outdir, indir: assetDir })
    )
  );

  // Create a virtual template for HTML files
  await Promise.all(
    pages.map(async (infile) => {
      const message = await workerPool.processFile({
        infile,
        outdir,
        indir: dir,
        clashRemap,
      });
      if (message.type === "process") {
        const { outfile, content, id, type, ...data } = message;
        eleventyConfig.addTemplate(outfile, content, {
          ...data,
          layout,
        });
      }
    })
  );

  workerPool.exit();
}

export default eleventyLesPagesJerriaisesPlugin;
