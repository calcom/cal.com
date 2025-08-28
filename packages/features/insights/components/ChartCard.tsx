"use client";

import { Fragment, type ReactNode } from "react";

import classNames from "@calcom/ui/classNames";
import { PanelCard } from "@calcom/ui/components/card";
import { Tooltip } from "@calcom/ui/components/tooltip";

type PanelCardProps = React.ComponentProps<typeof PanelCard>;

type LegendItem = {
  label: string;
  color: string; // hex format
};

export type LegendSize = "sm" | "default";

export function ChartCard({
  legend,
  legendSize,
  ...panelCardProps
}: PanelCardProps & {
  legend?: Array<LegendItem>;
  legendSize?: LegendSize;
}) {
  const legendComponent = legend && legend.length > 0 ? <Legend items={legend} size={legendSize} /> : null;

  return (
    <PanelCard {...panelCardProps} headerContent={legendComponent}>
      {panelCardProps.children}
    </PanelCard>
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
      <div className="grow text-sm font-medium">{children}</div>
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
            className="relative flex items-center gap-2 rounded-md px-1.5 py-0.5"
            style={{ backgroundColor: `${item.color}33` }}>
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <Tooltip content={item.label}>
              <p
                className={classNames(
                  "text-default truncate py-0.5 text-sm font-medium leading-none",
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
