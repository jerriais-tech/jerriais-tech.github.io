import React from "react";
import Layout from "../../../../layouts/Layout";

interface Topic {
  topic: string;
  slug: string;
  pages: { url: string }[];
}

interface Data {
  collections: { corpusTopicList: Topic[] };
}

export const data = {
  layout: false,
  eleventyImport: { collections: ["jerriais"] },
};

export default function ThemesIndex({ collections }: Data) {
  const topics: Topic[] = collections.corpusTopicList ?? [];

  return (
    <Layout title="Thèmes" currentUrl="/corpus/jerriais/themes/">
      <main className="my-8 mx-8 max-w-2xl md:mx-auto">
        <h1 className="text-3xl font-bold mb-6">Thèmes</h1>
        <div className="topic-pills">
          {topics.map((t) => (
            <a
              key={t.slug}
              href={`/corpus/jerriais/themes/${t.slug}/`}
              className="topic-pill"
            >
              {t.topic}{" "}
              <span className="text-xs opacity-70">({t.pages.length})</span>
            </a>
          ))}
        </div>
      </main>
    </Layout>
  );
}
