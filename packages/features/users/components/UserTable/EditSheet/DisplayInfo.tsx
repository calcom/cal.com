import { classNames } from "@calcom/lib";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import type { BadgeProps } from "@calcom/ui";
import { Badge, Button, Label } from "@calcom/ui";
import { ClipboardCheck, Clipboard } from "@calcom/ui/components/icon";

type DisplayInfoType<T extends boolean> = {
  label: string;
  value: T extends true ? string[] : string;
  asBadge?: boolean;
  isArray?: T;
  displayCopy?: boolean;
  badgeColor?: BadgeProps["variant"];
} & (T extends false
  ? { displayCopy?: boolean; displayCount?: never }
  : { displayCopy?: never; displayCount?: number }); // Only show displayCopy if its not an array is false

export function DisplayInfo<T extends boolean>({
  label,
  value,
  asBadge,
  isArray,
  displayCopy,
  displayCount,
  badgeColor,
}: DisplayInfoType<T>) {
  const { copyToClipboard, isCopied } = useCopy();
  const values = (isArray ? value : [value]) as string[];

  return (
    <div className="flex flex-col">
      <Label className="text-subtle mb-1 text-xs font-semibold uppercase leading-none">
        {label} {displayCount && `(${displayCount})`}
      </Label>
      <div className={classNames(asBadge ? "mt-0.5 flex space-x-2" : "flex flex-col")}>
        <>
          {values.map((v) => {
            const content = (
              <span
                className={classNames(
                  "text-emphasis inline-flex items-center gap-1 font-normal leading-5",
                  asBadge ? "text-xs" : "text-sm"
                )}>
                {v}
                {displayCopy && (
                  <Button
                    size="sm"
                    variant="icon"
                    onClick={() => copyToClipboard(v)}
                    color="minimal"
                    className="text-subtle rounded-md"
                    StartIcon={isCopied ? ClipboardCheck : Clipboard}
                  />
                )}
              </span>
            );

            return asBadge ? (
              <Badge variant={badgeColor} size="sm">
                {content}
              </Badge>
            ) : (
              content
            );
          })}
        </>
      </div>
    </div>
  );
}
