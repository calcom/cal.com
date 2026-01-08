import { useId } from "react";

import { Badge } from "@calcom/ui/components/badge";

import { LimitedBadges } from "@calcom/web/components/ui/LimitedBadges";

import { CellWithOverflowX } from "./CellWithOverflowX";

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
    <CellWithOverflowX className="flex w-[200px] gap-1">
      <LimitedBadges
        items={values}
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
    </CellWithOverflowX>
  );
}
