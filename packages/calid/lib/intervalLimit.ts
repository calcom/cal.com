import { z } from "zod";

export type IntervalLimitUnit = "day" | "week" | "month" | "year";
export type IntervalLimit = Partial<Record<`PER_${Uppercase<IntervalLimitUnit>}`, number>>;
export type IntervalLimitKey = keyof IntervalLimit;

export const orderedLimitKeys: IntervalLimitKey[] = ["PER_DAY", "PER_WEEK", "PER_MONTH", "PER_YEAR"];

export const reverseOrderedLimitKeys = [...orderedLimitKeys].reverse();

export const intervalLimitSchema: z.Schema<IntervalLimit | null> = z
  .object({
    PER_DAY: z.number().optional(),
    PER_WEEK: z.number().optional(),
    PER_MONTH: z.number().optional(),
    PER_YEAR: z.number().optional(),
  })
  .nullable();

function isValidUnit(unit: string): unit is IntervalLimitUnit {
  return ["day", "week", "month", "year"].includes(unit);
}

export function convertKeyToUnit(key: IntervalLimitKey): IntervalLimitUnit {
  const unitPart = key.split("_")[1]?.toLowerCase();
  if (isValidUnit(unitPart)) return unitPart;
  throw new Error(`Unrecognized interval limit key: ${key}`);
}

export function checkIntervalLimitOrder(limits: IntervalLimit): boolean {
  const sortedKeys = Object.entries(limits)
    .sort(([, a], [, b]) => (a ?? 0) - (b ?? 0))
    .map(([key]) => key as IntervalLimitKey);

  const expectedOrder = orderedLimitKeys.filter((key) => sortedKeys.includes(key));

  return sortedKeys.every((key, idx) => expectedOrder[idx] === key);
}
