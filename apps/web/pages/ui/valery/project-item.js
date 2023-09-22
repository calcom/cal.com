import Link from "next/link";

import ExternalLinkIcon from "../../ui/icons/external-link-icon";

const Project = ({ title, description, url }) => (
  <div className="inline-block w-full">
    <div className="mb-7 flex w-full flex-col">
      <div className="flex">
        <Link
          href={url || "/"}
          target="_blank"
          className="font-semibold decoration-gray-400 underline-offset-4 hover:underline">
          {title}
          <span className="whitespace-nowrap">
            {"\u2009"}
            <ExternalLinkIcon className="mt-0.5 inline-block align-top text-gray-300" />
          </span>
        </Link>
      </div>
      {description && (
        <div className="prose max-w-none break-words" dangerouslySetInnerHTML={{ __html: description }} />
      )}
      <div className="flex flex-row items-center justify-between gap-4 self-start text-gray-400" />
    </div>
  </div>
);

export default Project;
