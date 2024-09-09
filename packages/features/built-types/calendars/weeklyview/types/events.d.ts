import type { BookingStatus } from "@calcom/prisma/enums";
export interface CalendarEvent {
    id: number;
    title: string;
    description?: string;
    start: Date | string;
    end: Date;
    source?: string;
    options?: {
        status?: BookingStatus;
        hideTime?: boolean;
        allDay?: boolean;
        borderColor?: string;
        className?: string;
        "data-test-id"?: string;
    };
}
//# sourceMappingURL=events.d.ts.map