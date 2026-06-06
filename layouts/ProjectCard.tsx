import React from "react";

interface Props {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  href: string;
  ctaText: string;
}

const ProjectCard: React.FC<Props> = ({
  icon,
  title,
  description,
  href,
  ctaText,
}) => (
  <div className="flex gap-4">
    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-2xl shrink-0">
      {icon}
    </div>
    <div className="flex flex-col">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 flex-1">{description}</p>
      <a
        href={href}
        className="self-start inline-block text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm px-5 py-2.5 font-medium"
      >
        {ctaText}
      </a>
    </div>
  </div>
);

export default ProjectCard;
