import classNames from "@calcom/ui/classNames";
import type { PropsWithChildren } from "react";

interface TroubleshooterListItemContainerProps {
  title: string;
  subtitle?: string;
  suffixSlot?: React.ReactNode;
  prefixSlot?: React.ReactNode;
  className?: string;
}

export function TroubleshooterListItemHeader({
  prefixSlot,
  title,
  subtitle,
  suffixSlot,
  className,
}: TroubleshooterListItemContainerProps) {
  return (
    <div className={classNames("border-subtle flex max-w-full gap-3 border border-b-0 px-4 py-2", className)}>
      {prefixSlot}
      <div className="flex h-full max-w-full flex-1 flex-col flex-nowrap truncate text-sm leading-4">
        <p className="font-medium">{title}</p>
        {subtitle && <p className="font-normal">{subtitle}</p>}
      </div>
      {suffixSlot}
    </div>
  );
}

export function TroubleshooterListItemContainer({
  children,
  ...rest
}: PropsWithChildren<TroubleshooterListItemContainerProps>) {
  return (
    <div className="[&>*:first-child]:rounded-t-md ">
      <TroubleshooterListItemHeader {...rest} />
      <div className="border-subtle flex flex-col stack-y-3 rounded-b-md border p-4">{children}</div>
    </div>
  );
}
