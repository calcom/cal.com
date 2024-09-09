import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetMemberAvailabilityInputSchema } from "./getMemberAvailability.schema";
type GetMemberAvailabilityOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetMemberAvailabilityInputSchema;
};
export declare const getMemberAvailabilityHandler: ({ ctx, input }: GetMemberAvailabilityOptions) => Promise<{
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
export default getMemberAvailabilityHandler;
