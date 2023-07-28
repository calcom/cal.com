import { classNames } from "@calcom/lib";
import type { BadgeProps } from "@calcom/ui";
import { Badge, Button } from "@calcom/ui";
import { Copy } from "@calcom/ui/components/icon";

type DisplayInfoType<T extends boolean> = {
  label: string;
  value: T extends true ? string[] : string;
  asBadge?: boolean;
  isArray?: T;
  displayCopy?: boolean;
  badgeColor?: BadgeProps["variant"];
} & (T extends false ? { displayCopy?: boolean } : { displayCopy?: never }); // Only show displayCopy if its not an array is false

export function DisplayInfo<T extends boolean>({
  label,
  value,
  asBadge,
  isArray,
  displayCopy,
  badgeColor,
}: DisplayInfoType<T>) {
  const values = (isArray ? value : [value]) as string[];

  return (
    <div className="flex flex-col space-y-0.5">
      <p className="text-subtle text-xs font-semibold uppercase leading-none">{label}</p>
      <div className={classNames(asBadge ? "flex mt-0.5 space-x-2" : "flex flex-col")}>
        <>
          {values.map((v) => {
            const content = (
              <span
                className={classNames(
                  "text-emphasis inline-flex items-center gap-2 font-medium leading-5",
                  asBadge ? "text-xs" : "text-sm"
                )}>
                {v}
                {displayCopy && <Button size="sm" variant="icon" color="minimal" StartIcon={Copy} />}
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
