import { InfoIcon } from "@coss/ui/icons";
import { Tooltip } from "../tooltip/Tooltip";

export function InfoBadge({ content }: { content: string }) {
  return (
    <>
      <Tooltip side="top" content={content}>
        <span aria-label={content}>
          <InfoIcon className="text-subtle relative left-1 right-1 top-px mt-px h-4 w-4" />
        </span>
      </Tooltip>
    </>
  );
}
