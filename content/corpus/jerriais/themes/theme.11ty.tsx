import React from "react";
import Layout from "../../../../layouts/Layout";

interface Topic {
  topic: string;
  slug: string;
  pages: { url: string; data: { title: string } }[];
}

interface Data {
  pagination: { items: Topic[] };
}

export const data = {
  layout: false,
  eleventyImport: { collections: ["jerriais"] },
  pagination: {
    data: "collections.corpusTopicList",
    size: 1,
    alias: "topicGroup",
    addAllPagesToCollections: true,
  },
  permalink: (data: Data) => {
    const topic = data.pagination.items[0];
    return `/corpus/jerriais/themes/${topic.slug}/`;
  },
};

export default function ThemePage(data: Data & { topicGroup: Topic }) {
  const { topicGroup } = data;

  return (
    <Layout
      title={topicGroup.topic}
      currentUrl={`/corpus/jerriais/themes/${topicGroup.slug}/`}
    >
      <main className="my-8 mx-8 max-w-2xl md:mx-auto">
        <h1 className="text-3xl font-bold mb-6">{topicGroup.topic}</h1>
        <p className="text-slate-500 mb-4">{topicGroup.pages.length} page(s)</p>
        <ul className="space-y-1">
          {topicGroup.pages
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
