import { Fragment } from "react";

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
    <div className="bg-muted group relative w-full items-center rounded-2xl px-1 pb-1">
      <div className="flex h-11 items-center justify-between gap-2 px-4">
        <h2 className="text-emphasis shrink-0 text-sm font-semibold">{title}</h2>
        <div className="flex items-center gap-2">
          {legend && (legend || []).length > 0 && <Legend items={legend} size={legendSize} />}
          {cta && (
            <Button className="shrink-0" color="secondary" onClick={cta.onClick}>
              {cta.label}
            </Button>
          )}
        </div>
      </div>
      <div className="bg-default border-muted w-full gap-3 rounded-xl border">
        {subtitle && (
          <div className="text-subtle border-muted border-b p-3 text-sm font-medium leading-none">
            {subtitle}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function Legend({ items, size = "default" }: { items: LegendItem[]; size: LegendSize }) {
  return (
    <div className="bg-default flex items-center gap-2 rounded-lg px-1.5 py-1">
      {items.map((item, index) => (
        <Fragment key={item.label}>
          <div
            key={item.label}
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
