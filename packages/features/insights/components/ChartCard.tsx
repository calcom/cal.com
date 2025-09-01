"use client";

import { Fragment, useMemo, type ReactNode } from "react";

import classNames from "@calcom/ui/classNames";
import { PanelCard } from "@calcom/ui/components/card";
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
  enabledLegend,
  onSeriesToggle,
  children,
  className,
  titleTooltip,
}: {
  title: string | ReactNode;
  subtitle?: string;
  cta?: { label: string; onClick: () => void };
  legend?: Array<LegendItem>;
  legendSize?: LegendSize;
  enabledLegend?: Array<LegendItem>;
  onSeriesToggle?: (label: string) => void;
  className?: string;
  titleTooltip?: string;
  children: ReactNode;
}) {
  const legendComponent =
    legend && legend.length > 0 ? (
      <Legend items={legend} size={legendSize} enabledItems={enabledLegend} onItemToggle={onSeriesToggle} />
    ) : null;

  return (
    <PanelCard
      title={title}
      subtitle={subtitle}
      cta={cta}
      headerContent={legendComponent}
      className={className}
      titleTooltip={titleTooltip}>
      {children}
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

function Legend({
  items,
  size = "default",
  enabledItems,
  onItemToggle,
}: {
  items: LegendItem[];
  size?: LegendSize;
  enabledItems?: LegendItem[];
  onItemToggle?: (label: string) => void;
}) {
  const enabledSet = useMemo(() => new Set((enabledItems ?? []).map((i) => i.label)), [enabledItems]);
  const isClickable = Boolean(onItemToggle);

  return (
    <div className="bg-default flex items-center gap-2 rounded-lg px-1.5 py-1">
      {items.map((item, index) => {
        const isEnabled = enabledItems ? enabledSet.has(item.label) : true;

        return (
          <Fragment key={item.label}>
            <button
              type="button"
              className={classNames(
                "relative flex items-center gap-2 rounded-md px-1.5 py-0.5 transition-opacity",
                isClickable && "cursor-pointer hover:bg-gray-100",
                !isEnabled && "opacity-25"
              )}
              style={{ backgroundColor: `${item.color}33` }}
              aria-pressed={isClickable ? isEnabled : undefined}
              aria-label={`Toggle ${item.label}`}
              disabled={!isClickable}
              onClick={isClickable ? () => onItemToggle?.(item.label) : undefined}>
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <Tooltip content={item.label}>
                <span
                  className={classNames(
                    "text-default truncate py-0.5 text-sm font-medium leading-none",
                    size === "sm" ? "w-16" : ""
                  )}>
                  {item.label}
                </span>
              </Tooltip>
            </button>
            {index < items.length - 1 && <div className="bg-muted h-5 w-[1px]" />}
          </Fragment>
        );
      })}
    </div>
  );
}
