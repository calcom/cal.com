/// <reference types="react" />
import type { User } from "@calcom/prisma/client";
import type { useScheduleForEventReturnType } from "../utils/event";
export declare const DatePicker: ({ event, schedule, classNames, scrollToTimeSlots, }: {
    event: {
        data?: {
            users: Pick<User, "weekStart">[];
        } | null;
    };
    schedule: useScheduleForEventReturnType;
    classNames?: {
        datePickerContainer?: string | undefined;
        datePickerTitle?: string | undefined;
        datePickerDays?: string | undefined;
        datePickerDate?: string | undefined;
        datePickerDatesActive?: string | undefined;
        datePickerToggle?: string | undefined;
    } | undefined;
    scrollToTimeSlots?: (() => void) | undefined;
}) => JSX.Element;
//# sourceMappingURL=DatePicker.d.ts.map