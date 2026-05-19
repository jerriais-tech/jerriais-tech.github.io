import React from "react";

interface Props {
  title: string;
  currentUrl?: string;
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ title, currentUrl, children }) => (
  <html translate="no">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <link href="/index.css" rel="stylesheet" />
    </head>
    <body>
      <header>
        <details className="site-nav">
          <summary>Les Pages Jèrriaises ☰</summary>
          <nav>
            <a
              href="/corpus/jerriais/"
              aria-current={currentUrl === "/corpus/jerriais/" ? "page" : undefined}
            >
              Les Pages Jèrriaises
            </a>
            <a
              href="/corpus/jerriais/a/"
              aria-current={currentUrl?.startsWith("/corpus/jerriais/") && /^\/corpus\/jerriais\/[a-z]\/$/.test(currentUrl ?? "") ? "page" : undefined}
            >
              Texts A–Z
            </a>
            <a
              href="/corpus/jerriais/auteurs/"
              aria-current={currentUrl?.startsWith("/corpus/jerriais/auteurs/") ? "page" : undefined}
            >
              Authors
            </a>
            <a
              href="/corpus/jerriais/themes/"
              aria-current={currentUrl?.startsWith("/corpus/jerriais/themes/") ? "page" : undefined}
            >
              Topics
            </a>
          </nav>
        </details>
      </header>
      {children}
    </body>
  </html>
);

export default Layout;
