import React from "react";
import Layout from "../../../../layouts/Layout";

interface Author {
  slug: string;
  name: string;
  pages: { url: string; data: { title: string } }[];
}

interface Data {
  pagination: { items: Author[] };
}

export const data = {
  layout: false,
  eleventyImport: { collections: ["jerriais"] },
  pagination: {
    data: "collections.corpusAuthorList",
    size: 1,
    alias: "author",
    addAllPagesToCollections: true,
  },
  permalink: (data: Data) => {
    const author = data.pagination.items[0];
    return `/corpus/jerriais/auteurs/${author.slug}/`;
  },
};

export default function AuteurPage(data: Data & { author: Author }) {
  const { author } = data;

  return (
    <Layout
      title={author.name}
      currentUrl={`/corpus/jerriais/auteurs/${author.slug}/`}
    >
      <main className="my-8 mx-8 max-w-2xl md:mx-auto">
        <h1 className="text-3xl font-bold mb-6">{author.name}</h1>
        <p className="text-slate-500 mb-4">{author.pages.length} page(s)</p>
        <ul className="space-y-1">
          {author.pages
            .sort((a, b) => a.data.title.localeCompare(b.data.title))
            .map((p) => (
              <li key={p.url}>
                <a href={p.url}>{p.data.title}</a>
              </li>
            ))}
        </ul>
      </main>
    </Layout>
  );
}
