import { classNames } from "@calcom/lib";
import { Tooltip } from "@calcom/ui";
import { Info } from "@calcom/ui/components/icon";

type Props = {
  className?: string;
  content: string;
};

export default function InfoBadge({ content, className }: Props) {
  return (
    <>
      <Tooltip side="top" content={content}>
        <span title={content}>
          <Info
            className={classNames("text-subtle relative left-1 right-1 top-px mt-px h-4 w-4", className)}
          />
        </span>
      </Tooltip>
    </>
  );
}
