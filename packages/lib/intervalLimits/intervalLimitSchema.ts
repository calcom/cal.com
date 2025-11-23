import { z } from "zod";

export type IntervalLimitUnit = "day" | "week" | "month" | "year";
export type IntervalLimit = Partial<Record<`PER_${Uppercase<IntervalLimitUnit>}`, number | undefined>>;
export type IntervalLimitKey = keyof IntervalLimit;

export const intervalLimitsType: z.Schema<IntervalLimit | null> = z
  .object({
    PER_DAY: z.number().optional(),
    PER_WEEK: z.number().optional(),
    PER_MONTH: z.number().optional(),
    PER_YEAR: z.number().optional(),
  })
  .nullable();
