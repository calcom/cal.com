import { useId } from "react";

import { Badge } from "@calcom/ui/components/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@calcom/ui/components/popover";

import { CellWithOverflowX } from "./CellWithOverflowX";

const MAX_VISIBLE_BADGES = 2;

type LimitedBadgesProps<T> = {
  items: T[];
  renderBadge: (item: T, index: number) => React.ReactNode;
  renderOverflowItem: (item: T, index: number) => React.ReactNode;
  maxVisible?: number;
  className?: string;
  wrapInCell?: boolean;
};

export function LimitedBadges<T>({
  items,
  renderBadge,
  renderOverflowItem,
  maxVisible = MAX_VISIBLE_BADGES,
  className,
  wrapInCell = false,
}: LimitedBadgesProps<T>) {
  if (items.length === 0) return null;

  const visibleItems = items.slice(0, maxVisible);
  const hiddenItems = items.slice(maxVisible);
  const hasHiddenItems = hiddenItems.length > 0;

  const content = (
    <>
      {visibleItems.map((item, index) => renderBadge(item, index))}
      {hasHiddenItems && (
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" className="cursor-pointer">
              <Badge variant="gray">+{hiddenItems.length}</Badge>
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="start" className="w-fit p-2">
            <div className="flex flex-col gap-1">
              {hiddenItems.map((item, index) => renderOverflowItem(item, index))}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </>
  );

  if (wrapInCell) {
    return <CellWithOverflowX className={className}>{content}</CellWithOverflowX>;
  }

  return <div className={className}>{content}</div>;
}

export function ResponseValueCell({
  optionMap,
  values,
  rowId,
}: {
  optionMap: Record<string, string>;
  values: string[];
  rowId: number;
}) {
  const cellId = useId();
  if (values.length === 0) return <div className="h-6 w-[200px]" />;

  return (
    <LimitedBadges
      items={values}
      className="flex w-[200px] gap-1"
      wrapInCell
      renderBadge={(id, i) => (
        <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
          {optionMap[id] ?? id}
        </Badge>
      )}
      renderOverflowItem={(id, i) => (
        <span key={`${cellId}-overflow-${i}-${rowId}`} className="text-default text-sm">
          {optionMap[id] ?? id}
        </span>
      )}
    />
  );
}
