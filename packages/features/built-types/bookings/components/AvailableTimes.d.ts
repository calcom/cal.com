/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { IGetAvailableSlots } from "@calcom/trpc/server/routers/viewer/slots/util";
type TOnTimeSelect = (time: string, attendees: number, seatsPerTimeSlot?: number | null, bookingUid?: string) => void;
type AvailableTimesProps = {
    slots: IGetAvailableSlots["slots"][string];
    onTimeSelect: TOnTimeSelect;
    seatsPerTimeSlot?: number | null;
    showAvailableSeatsCount?: boolean | null;
    showTimeFormatToggle?: boolean;
    className?: string;
    selectedSlots?: string[];
    event: {
        data?: Pick<BookerEvent, "length"> | null;
    };
    customClassNames?: string;
};
export declare const AvailableTimes: ({ slots, onTimeSelect, seatsPerTimeSlot, showAvailableSeatsCount, showTimeFormatToggle, className, selectedSlots, event, customClassNames, }: AvailableTimesProps) => JSX.Element;
export declare const AvailableTimesSkeleton: () => JSX.Element;
export {};
//# sourceMappingURL=AvailableTimes.d.ts.map