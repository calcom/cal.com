import type { TrpcSessionUser } from "../../../trpc";
import type { TUserInputSchema } from "./user.schema";
type UserOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TUserInputSchema;
};
export declare const userHandler: ({ input }: UserOptions) => Promise<{
    busy: import("@calcom/types/Calendar").EventBusyDetails[];
    timeZone: string;
    dateRanges: import("@calcom/lib/date-ranges").DateRange[];
    oooExcludedDateRanges: import("@calcom/lib/date-ranges").DateRange[];
    workingHours: import("@calcom/types/schedule").WorkingHours[];
    dateOverrides: import("@calcom/types/schedule").TimeRange[];
    currentSeats: {
        uid: string;
        startTime: Date;
        _count: {
            attendees: number;
        };
    }[] | null;
    datesOutOfOffice: import("@calcom/core/getUserAvailability").IOutOfOfficeData;
}>;
export {};
