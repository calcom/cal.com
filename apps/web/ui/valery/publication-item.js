import Link from "next/link";

const Publication = ({ title, description, links, url }) => (
  <div className="flex w-full flex-col">
    <div className="font-semibold ">
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {title}
        </a>
      ) : (
        <span>{title}</span>
      )}
    </div>
    {description && (
      <div className="" style={{ wordBreak: "break-word" }}>
        {description}
      </div>
    )}
    <div className="flex flex-row items-center justify-between gap-4 self-start">
      {links &&
        links.map(({ label, href }, index) => (
          <Link
            href={href}
            key={index}
            className="text-gray-400 decoration-gray-300 underline-offset-4 hover:text-gray-500 hover:underline">
            {label}
          </Link>
        ))}
    </div>
  </div>
);

export default Publication;
