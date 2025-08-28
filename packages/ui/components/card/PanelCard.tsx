import type { ReactNode } from "react";

import classNames from "@calcom/ui/classNames";
import { InfoBadge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";

export function PanelCard({
  title,
  subtitle,
  cta,
  headerContent,
  className,
  titleTooltip,
  children,
}: {
  title: string | ReactNode;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  headerContent?: ReactNode;
  className?: string;
  titleTooltip?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={classNames(
        "bg-muted group relative flex w-full flex-col items-center rounded-2xl px-1 pb-1",
        className
      )}>
      <div className="flex h-11 w-full shrink-0 items-center justify-between gap-2 px-4">
        {typeof title === "string" ? (
          <div className="mr-4 flex shrink-0 items-center gap-1">
            <h2 className="text-emphasis shrink-0 text-sm font-semibold">{title}</h2>
            {titleTooltip && <InfoBadge content={titleTooltip} />}
          </div>
        ) : (
          title
        )}
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {headerContent}
          {cta && (
            <Button className="shrink-0" color="secondary" onClick={cta.onClick}>
              {cta.label}
            </Button>
          )}
        </div>
      </div>
      <div className="bg-default border-muted w-full grow gap-3 rounded-xl border">
        {subtitle && (
          <h3 className="text-subtle border-muted border-b p-3 text-sm font-medium leading-none">
            {subtitle}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
