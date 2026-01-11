"use client";

import { Fragment, useMemo, type ReactNode } from "react";

import classNames from "@calcom/ui/classNames";
import { PanelCard } from "@calcom/ui/components/card";
import { Spinner } from "@calcom/ui/components/icon";
import { SkeletonText } from "@calcom/ui/components/skeleton";
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
  enabledLegend,
  onSeriesToggle,
  isPending,
  isError,
  ...panelCardProps
}: Omit<PanelCardProps, 'children'> & {
  legend?: Array<LegendItem>;
  legendSize?: LegendSize;
  enabledLegend?: Array<LegendItem>;
  onSeriesToggle?: (label: string) => void;
  isPending?: boolean;
  isError?: boolean;
  children?: ReactNode;
}) {
  const legendComponent =
    legend && legend.length > 0 ? (
      <Legend items={legend} size={legendSize} enabledItems={enabledLegend} onItemToggle={onSeriesToggle} />
    ) : null;

  // Generate a chart ID from the title for testing purposes
  const chartId = useMemo(() => {
    if (typeof panelCardProps.title === "string") {
      return panelCardProps.title.toLowerCase().replace(/\s+/g, "-");
    }
    return undefined;
  }, [panelCardProps.title]);

  // Calculate loading state from isPending/isError
  const computedLoadingState = useMemo(() => {
    if (isPending) return "loading";
    if (isError) return "error";
    return "loaded";
  }, [isPending, isError]);

  const shouldShowDefaultLoading = isPending && !panelCardProps.children;

  const displayTitle = shouldShowDefaultLoading ? <SkeletonText className="w-32" /> : panelCardProps.title;

  return (
    <PanelCard
      {...panelCardProps}
      title={displayTitle}
      data-testid="chart-card"
      data-chart-id={chartId}
      data-loading-state={computedLoadingState}
      headerContent={
        panelCardProps.headerContent ? (
          <div className="flex items-center gap-2">
            {panelCardProps.headerContent}
            {legendComponent}
          </div>
        ) : (
          legendComponent
        )
      }>
      {shouldShowDefaultLoading ? (
        <div className="m-auto flex h-80 flex-col items-center justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        panelCardProps.children
      )}
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
            {index < items.length - 1 && <div className="bg-cal-muted h-5 w-px" />}
          </Fragment>
        );
      })}
    </div>
  );
}
