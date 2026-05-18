import React from "react";

interface Props {
  title: string;
  children: React.ReactNode;
}

const Layout: React.FC<Props> = ({ title, children }) => (
  <html translate="no">
    <head>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>{title}</title>
      <link href="/index.css" rel="stylesheet" />
    </head>
    <body>{children}</body>
  </html>
);

export default Layout;
