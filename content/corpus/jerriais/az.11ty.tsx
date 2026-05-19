import React from "react";
import Layout from "../../../layouts/Layout";

const ALL_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface LetterGroup {
  letter: string;
  pages: { url: string; data: { title: string } }[];
}

interface Data {
  pagination: { items: LetterGroup[]; hrefs: string[] };
  collections: { corpusByLetter: LetterGroup[] };
}

export const data = {
  layout: false,
  eleventyImport: { collections: ["jerriais"] },
  pagination: {
    data: "collections.corpusByLetter",
    size: 1,
    alias: "letterGroup",
    addAllPagesToCollections: true,
  },
  permalink: (data: Data) => {
    const letter = data.pagination.items[0]?.letter;
    return `/corpus/jerriais/${letter.toLowerCase()}/`;
  },
};

export default function AzPage(data: Data & { letterGroup: LetterGroup }) {
  const { letterGroup, collections } = data;
  const { letter, pages } = letterGroup;
  const presentLetters = new Set(
    collections.corpusByLetter.map((g: LetterGroup) => g.letter)
  );

  return (
    <Layout title={`Textes — ${letter}`} currentUrl={`/corpus/jerriais/${letter.toLowerCase()}/`}>
      <main className="my-8 mx-8 max-w-3xl md:mx-auto">
        <h1 className="text-3xl font-bold mb-4">Textes — {letter}</h1>
        <nav className="letter-strip" aria-label="Index par lettre">
          {ALL_LETTERS.map((l) =>
            presentLetters.has(l) ? (
              <a
                key={l}
                href={`/corpus/jerriais/${l.toLowerCase()}/`}
                aria-current={l === letter ? "page" : undefined}
              >
                {l}
              </a>
            ) : (
              <span key={l} aria-hidden="true">{l}</span>
            )
          )}
        </nav>
        <ul className="mt-6 space-y-1">
          {pages.map((p) => (
            <li key={p.url}>
              <a href={p.url}>{p.data.title}</a>
            </li>
          ))}
        </ul>
      </main>
    </Layout>
  );
}
