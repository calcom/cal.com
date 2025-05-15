import { useId } from "react";

import { Badge } from "@calcom/ui/components/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  HoverCardPortal,
} from "@calcom/ui/components/hover-card";

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
      {values.length > 2 ? (
        <>
          {values.slice(0, 2).map((id: string, i: number) => (
            <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
              {optionMap[id] ?? id}
            </Badge>
          ))}
          <HoverCard>
            <HoverCardTrigger>
              <Badge variant="gray">+{values.length - 2}</Badge>
            </HoverCardTrigger>
            <HoverCardPortal>
              <HoverCardContent side="bottom" align="start" className="w-fit">
                <div className="flex flex-col gap-1">
                  {values.slice(2).map((id: string, i: number) => (
                    <span key={`${cellId}-overflow-${i}-${rowId}`} className="text-default text-sm">
                      {optionMap[id] ?? id}
                    </span>
                  ))}
                </div>
              </HoverCardContent>
            </HoverCardPortal>
          </HoverCard>
        </>
      ) : (
        values.map((id: string, i: number) => (
          <Badge key={`${cellId}-${i}-${rowId}`} variant="gray">
            {optionMap[id] ?? id}
          </Badge>
        ))
      )}
    </CellWithOverflowX>
  );
}
