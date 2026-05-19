import React from "react";
import Layout from "../../../../layouts/Layout";

interface Author {
  slug: string;
  name: string;
  pages: { url: string }[];
}

interface Data {
  collections: { corpusAuthorList: Author[] };
}

export const data = {
  layout: false,
  eleventyImport: { collections: ["jerriais"] },
};

export default function AuteursIndex({ collections }: Data) {
  const authors: Author[] = collections.corpusAuthorList ?? [];

  return (
    <Layout title="Auteurs" currentUrl="/corpus/jerriais/auteurs/">
      <main className="my-8 mx-8 max-w-2xl md:mx-auto">
        <h1 className="text-3xl font-bold mb-6">Auteurs</h1>
        <ul className="space-y-1">
          {authors.map((a) => (
            <li key={a.slug}>
              <a href={`/corpus/jerriais/auteurs/${a.slug}/`}>{a.name}</a>
              <span className="text-sm text-slate-500 ml-2">
                ({a.pages.length})
              </span>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
}
