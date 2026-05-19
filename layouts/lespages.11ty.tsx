import React from "react";
import Content from "./Content";
import Layout from "./Layout";

interface AuthorPage {
  url: string;
  data: { title: string };
}

interface Props {
  title: string;
  author?: string;
  authorSlug?: string;
  authorPage?: boolean;
  multiAuthorSuspected?: boolean;
  related: { url: string; text: string }[];
  topics?: string[];
  content: string;
  page: { url: string };
  collections: {
    corpusAuthorMap?: Record<string, AuthorPage[]>;
    corpusTopicMap?: Record<string, string>;
  };
}

const LesPagesLayout: React.FC<Props> = ({
  title,
  author,
  authorSlug,
  authorPage,
  related,
  topics,
  content,
  page,
  collections,
}) => {
  const authorPages: AuthorPage[] = authorSlug
    ? (collections.corpusAuthorMap?.[authorSlug] ?? [])
        .filter((p) => p.url !== page.url)
        .slice(0, 10)
    : [];

  const topicMap = collections.corpusTopicMap ?? {};
  const topicPills = (topics ?? []).filter((t) => topicMap[t]);

  const hasSidebar = (authorSlug && authorPages.length > 0) || topicPills.length > 0;

  return (
    <Layout title={title} currentUrl={page.url}>
      <div className={hasSidebar ? "corpus-layout" : undefined}>
        <main className="my-8 mx-8 max-w-2xl md:mx-auto">
          <article>
            <header className="my-4">
              <h1 className="text-3xl font-bold">{title}</h1>
              {author && !authorPage && (
                <h2 className="text-xl italic">
                  <a href={`/corpus/jerriais/auteurs/${authorSlug}/`} rel="author">
                    {author}
                  </a>
                </h2>
              )}
            </header>
            <Content>{content}</Content>
            <footer className="prose my-8">
              {related && related.length > 0 && (
                <>
                  <h3>Viyiz étout</h3>
                  <ul>
                    {related.map(({ url, text }) => (
                      <li key={url}>
                        <a href={url}>{text}</a>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </footer>
          </article>
        </main>
        {hasSidebar && (
          <aside className="corpus-sidebar">
            {authorSlug && authorPages.length > 0 && (
              <section className="sidebar-section">
                <h3>Aôt'yes pages par {author}</h3>
                <ul>
                  {authorPages.map((p) => (
                    <li key={p.url}>
                      <a href={p.url}>{p.data.title}</a>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/corpus/jerriais/auteurs/${authorSlug}/`}
                  className="sidebar-see-all"
                >
                  Voir toutes les pages →
                </a>
              </section>
            )}
            {topicPills.length > 0 && (
              <section className="sidebar-section">
                <h3>Thèmes</h3>
                <div className="topic-pills">
                  {topicPills.map((t) => (
                    <a
                      key={t}
                      href={`/corpus/jerriais/themes/${topicMap[t]}/`}
                      className="topic-pill"
                    >
                      {t}
                    </a>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
      <script src="/pronunciation.js" defer={true} />
    </Layout>
  );
};

export default LesPagesLayout;
