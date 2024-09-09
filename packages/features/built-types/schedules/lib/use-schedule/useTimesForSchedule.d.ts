import type { UseScheduleWithCacheArgs } from "./useSchedule";
type UseTimesForScheduleProps = Pick<UseScheduleWithCacheArgs, "month" | "monthCount" | "dayCount" | "selectedDate" | "prefetchNextMonth">;
export declare const useTimesForSchedule: ({ month, monthCount, selectedDate, dayCount, prefetchNextMonth, }: UseTimesForScheduleProps) => [string, string];
export {};
//# sourceMappingURL=useTimesForSchedule.d.ts.map