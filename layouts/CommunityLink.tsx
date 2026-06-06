import React from "react";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  href: string;
  linkText: string;
}

const ChevronRight: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path
      fillRule="evenodd"
      d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
    />
  </svg>
);

const CommunityLink: React.FC<Props> = ({
  icon,
  title,
  description,
  href,
  linkText,
}) => (
  <div className="flex gap-4">
    <div className="text-gray-500 text-2xl shrink-0">{icon}</div>
    <div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-gray-600 mb-2">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline inline-flex items-center gap-1"
      >
        {linkText}
        <ChevronRight />
      </a>
    </div>
  </div>
);

export default CommunityLink;
