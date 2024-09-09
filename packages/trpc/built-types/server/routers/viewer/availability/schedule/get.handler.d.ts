import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetInputSchema } from "./get.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetInputSchema;
};
export declare const getHandler: ({ ctx, input }: GetOptions) => Promise<{
    id: number;
    name: string;
    isManaged: boolean;
    workingHours: import("@calcom/types/schedule").WorkingHours[];
    schedule: {
        id: number;
        userId: number | null;
        eventTypeId: number | null;
        startTime: Date;
        endTime: Date;
        scheduleId: number | null;
        days: number[];
        date: Date | null;
    }[];
    availability: {
        end: Date;
        userId?: number | null | undefined;
        start: Date;
    }[][];
    timeZone: string;
    dateOverrides: {
        ranges: import("@calcom/types/schedule").TimeRange[];
    }[];
    isDefault: boolean;
    isLastSchedule: boolean;
    readOnly: boolean;
}>;
export {};
