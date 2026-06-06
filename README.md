# Jèrriais Tech website

This repo contains the source code and content for the Jèrriais Tech website, including an archive of Les Pages Jèrriaises.

## Static site generation

The site is built using Eleventy. The templating system is based on React with Tailwind classes, but rendered to static HTML at build time, so event handlers don't work and any interactivity must be set up as if it is vanilla JS. There is currently just a single page of content for the main site.

## Jèrriais corpus

Les Pages Jèrriaises is a collection of thousands of Jèrriais documents maintained as a plain HTML website since the late 1990s. These files use framesets, are often malformed, and do not display well on mobile. We use an Eleventy plugin to parse an archive of Les Pages, extract metadata and render to markdown before passing to Eleventy.

### Issues

- Some pages include interactive JavaScript games which are lost in this process
- Particularly index pages often contain a "random image" script which gets corrupted and renders badly
- The link structure migration "jerriais.html" => "jerriais/index.html" causes some issues (temporarily solved by denylisting files)
- The metadata extraction is flaky, sometimes misattributing to authors whose name happens to be on the page
- We have not yet extracted the menu in the main frameset page
