import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetByUserIdInputSchema } from "./getScheduleByUserId.schema";
type GetOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
        prisma: PrismaClient;
    };
    input: TGetByUserIdInputSchema;
};
export declare const getScheduleByUserIdHandler: ({ ctx, input }: GetOptions) => Promise<{
    hasDefaultSchedule: boolean;
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
} | {
    id: number;
    name: string;
    availability: never[][];
    dateOverrides: never[];
    timeZone: string;
    workingHours: never[];
    isDefault: boolean;
    hasDefaultSchedule: boolean;
}>;
export {};
