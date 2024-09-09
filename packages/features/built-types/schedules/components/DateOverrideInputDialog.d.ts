/// <reference types="react" />
import type { WorkingHours } from "@calcom/types/schedule";
import type { TimeRange } from "./Schedule";
declare const DateOverrideInputDialog: ({ Trigger, excludedDates, userTimeFormat, weekStart, className, ...passThroughProps }: {
    workingHours: WorkingHours[];
    excludedDates?: string[] | undefined;
    Trigger: React.ReactNode;
    onChange: (newValue: TimeRange[]) => void;
    value?: TimeRange[] | undefined;
    userTimeFormat: number | null;
    weekStart?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
    className?: string | undefined;
}) => JSX.Element;
export default DateOverrideInputDialog;
//# sourceMappingURL=DateOverrideInputDialog.d.ts.map