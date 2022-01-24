import { InformationCircleIcon } from "@heroicons/react/solid";

import { Tooltip } from "@components/Tooltip";

export default function InfoBadge({ content }: { content: string }) {
  return (
    <>
      <Tooltip content={content}>
        <span title={content}>
          <InformationCircleIcon className="relative w-4 h-4 mt-px text-gray-500 top-px left-1 right-1" />
        </span>
      </Tooltip>
    </>
  );
}
