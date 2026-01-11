import { LimitedBadges } from "@calcom/web/components/ui/LimitedBadges";

import { CellWithOverflowX } from "./CellWithOverflowX";

export function ResponseValueCell({
  optionMap,
  values,
}: {
  optionMap: Record<string, string>;
  values: string[];
}): JSX.Element {
  if (values.length === 0) return <div className="h-6 w-[200px]" />;

  return (
    <CellWithOverflowX className="flex w-[200px] gap-1">
      <LimitedBadges
        items={values.map((id) => ({
          label: optionMap[id] ?? id,
          variant: "gray" as const,
        }))}
      />
    </CellWithOverflowX>
  );
}
