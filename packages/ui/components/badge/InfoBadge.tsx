import { InfoIcon } from "lucide-react";

import { Tooltip } from "../tooltip/Tooltip";

export function InfoBadge({ content }: { content: string }) {
  return (
    <>
      <Tooltip side="top" content={content}>
        <span title={content}>
          <InfoIcon className="text-subtle relative left-1 right-1 top-px mt-px h-4 w-4" />
        </span>
      </Tooltip>
    </>
  );
}
