import { cx } from "class-variance-authority";
import Link from "next/link";

import ExternalLinkIcon from "../../ui/icons/external-link-icon";

const FactItem = ({ title, description, url }) => {
  // Check if there is a link
  const isLink = url !== undefined && url !== null && url !== "";

  const containerClasses = cx(
    "col-span-1 flex h-48 flex-col justify-between rounded-lg bg-white px-5 py-4 text-gray-600 transition-all",
    isLink && "hover:shadow-lg active:shadow-md active:bg-gray-50"
  );

  const tileContent = (
    <>
      <div className="flex items-start gap-6">
        <div className="mt-0 w-full text-2xl font-semibold leading-[28px]">{title}</div>
        {/* Only show external link icon when there's a link */}
        {isLink && <ExternalLinkIcon size={12} className="text-gray-300" />}
      </div>
      <div className="leading-[24px]">{description}</div>
    </>
  );

  // If there is a link, wrap the tile content in a link
  if (isLink) {
    return (
      <Link href={url} className={containerClasses}>
        {tileContent}
      </Link>
    );
  } else {
    return <div className={containerClasses}>{tileContent}</div>;
  }
};

export default FactItem;
