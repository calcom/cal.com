import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetByEventSlugInputSchema } from "./getScheduleByEventTypeSlug.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetByEventSlugInputSchema;
};
export declare const getScheduleByEventSlugHandler: ({ ctx, input }: GetOptions) => Promise<{
    id: number;
    name: string;
    isManaged: boolean;
    workingHours: import("@calcom/types/schedule").WorkingHours[];
    schedule: {
        date: Date | null;
        days: number[];
        id: number;
        userId: number | null;
        scheduleId: number | null;
        eventTypeId: number | null;
        startTime: Date;
        endTime: Date;
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
} | {
    id: number;
    name: string;
    availability: never[][];
    dateOverrides: never[];
    timeZone: string;
    workingHours: never[];
    isDefault: boolean;
}>;
export {};
