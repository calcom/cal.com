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
}): JSX.Element {
  if (values.length === 0) return <div className="h-6 w-[200px]" />;

  return (
    <CellWithOverflowX className="flex w-[200px] gap-1">
      <LimitedBadges
        items={values.map((id) => ({
          id: `${id}-${rowId}`,
          label: optionMap[id] ?? id,
          variant: "gray" as const,
        }))}
      />
    </CellWithOverflowX>
  );
}
