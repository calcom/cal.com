/// <reference types="react" />
import type { Dayjs } from "@calcom/dayjs";
type AvailableTimesHeaderProps = {
    date: Dayjs;
    showTimeFormatToggle?: boolean;
    availableMonth?: string | undefined;
    customClassNames?: {
        availableTimeSlotsHeaderContainer?: string;
        availableTimeSlotsTitle?: string;
        availableTimeSlotsTimeFormatToggle?: string;
    };
};
export declare const AvailableTimesHeader: ({ date, showTimeFormatToggle, availableMonth, customClassNames, }: AvailableTimesHeaderProps) => JSX.Element;
export {};
//# sourceMappingURL=AvailableTimesHeader.d.ts.map