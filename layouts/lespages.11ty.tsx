import React from "react";
import Content from "./Content";
import Layout from "./Layout";

const pronunciationScript = `
document.querySelectorAll('button.pronunciation').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var audio = new Audio(btn.dataset.audio);
    audio.play();
    btn.classList.add('pronunciation--playing');
    audio.addEventListener('ended', function() {
      btn.classList.remove('pronunciation--playing');
    });
  });
});
`;

interface Props {
  title: string;
  author?: string;
  authorSlug?: string;
  authorPage?: boolean;
  multiAuthorSuspected?: boolean;
  related: { url: string; text: string }[];
  content: string;
}

const LesPagesLayout: React.FC<Props> = ({
  title,
  author,
  authorSlug,
  authorPage,
  related,
  content,
}) => {
  return (
    <Layout title={title}>
      <main className="my-8 mx-8 max-w-2xl md:mx-auto">
        <article>
          <header className="my-4">
            <h1 className="text-3xl font-bold">{title}</h1>
            {author && !authorPage && (
              <h2 className="text-xl italic">
                <a href={`/corpus/jerriais/${authorSlug}`} rel="author">
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
      <script dangerouslySetInnerHTML={{ __html: pronunciationScript }} />
    </Layout>
  );
};

export default LesPagesLayout;
