import { Fragment, type ReactNode } from "react";

import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Tooltip } from "@calcom/ui/components/tooltip";

type LegendItem = {
  label: string;
  color: string; // hex format
};

export type LegendSize = "sm" | "default";

export function ChartCard({
  title,
  subtitle,
  cta,
  legend,
  legendSize,
  children,
}: {
  title: string;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  legend?: Array<LegendItem>;
  legendSize?: LegendSize;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted group relative flex w-full flex-col items-center rounded-2xl px-1 pb-1">
      <div className="flex h-11 w-full shrink-0 items-center justify-between gap-2 px-4">
        <h2 className="text-emphasis mr-4 shrink-0 text-sm font-semibold">{title}</h2>
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          {legend && legend.length > 0 && <Legend items={legend} size={legendSize} />}
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

export function ChartCardItem({
  count,
  className,
  children,
}: {
  count?: number | string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={classNames(
        "text-default border-muted flex items-center justify-between border-b px-3 py-3.5 last:border-b-0",
        className
      )}>
      <div className="text-sm font-medium">{children}</div>
      {count !== undefined && <div className="text-sm font-medium">{count}</div>}
    </div>
  );
}

function Legend({ items, size = "default" }: { items: LegendItem[]; size?: LegendSize }) {
  return (
    <div className="bg-default flex items-center gap-2 rounded-lg px-1.5 py-1">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          <div
            className="relative flex items-center gap-2 rounded-md px-1.5 py-1"
            style={{ backgroundColor: `${item.color}33` }}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <Tooltip content={item.label}>
              <p
                className={classNames(
                  "text-default truncate text-sm font-medium leading-none",
                  size === "sm" ? "w-16" : ""
                )}>
                {item.label}
              </p>
            </Tooltip>
          </div>
          {index < items.length - 1 && <div className="bg-muted h-5 w-[1px]" />}
        </Fragment>
      ))}
    </div>
  );
}
