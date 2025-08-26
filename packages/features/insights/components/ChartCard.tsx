"use client";

import { Fragment } from "react";

import classNames from "@calcom/ui/classNames";
import { PanelCard, PanelCardItem } from "@calcom/ui/components/card";
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
  title: string | React.ReactNode;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  legend?: Array<LegendItem>;
  legendSize?: LegendSize;
  children: React.ReactNode;
}) {
  const legendComponent = legend && legend.length > 0 ? <Legend items={legend} size={legendSize} /> : null;

  return (
    <PanelCard title={title} subtitle={subtitle} cta={cta} headerActions={legendComponent}>
      {children}
    </PanelCard>
  );
}

export { PanelCardItem as ChartCardItem };

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
