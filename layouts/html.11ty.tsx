import React from "react";
import Layout from "./Layout";

interface Props {
  title: string;
  content: string;
}

const HtmlLayout: React.FC<Props> = ({ title, content }) => {
  return (
    <Layout title={title}>
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </Layout>
  );
};

export default HtmlLayout;
