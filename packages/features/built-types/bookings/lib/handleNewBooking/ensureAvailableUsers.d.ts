import type { Logger } from "tslog";
import type { getEventTypeResponse } from "./getEventTypesFromDB";
import type { IsFixedAwareUser, BookingType } from "./types";
export declare function ensureAvailableUsers(eventType: getEventTypeResponse & {
    users: IsFixedAwareUser[];
}, input: {
    dateFrom: string;
    dateTo: string;
    timeZone: string;
    originalRescheduledBooking?: BookingType;
}, loggerWithEventDetails: Logger<unknown>): Promise<IsFixedAwareUser[]>;
//# sourceMappingURL=ensureAvailableUsers.d.ts.map