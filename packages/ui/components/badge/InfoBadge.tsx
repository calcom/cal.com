import { Icon } from "../icon";
import { Tooltip } from "../tooltip/Tooltip";

export function InfoBadge({ content }: { content: string }) {
  return (
    <>
      <Tooltip
        side="top"
        content={content}
        className="max-w-[280px] whitespace-normal break-words text-center sm:max-w-none sm:whitespace-nowrap">
        <span title={content}>
          <Icon name="info" className="text-subtle relative left-1 right-1 top-px mt-px h-4 w-4" />
        </span>
      </Tooltip>
    </>
  );
}
