import type { TrpcSessionUser } from "../../../../trpc";
import type { TUpdateInputSchema } from "./update.schema";
type User = NonNullable<TrpcSessionUser>;
type UpdateOptions = {
    ctx: {
        user: {
            id: User["id"];
            defaultScheduleId: User["defaultScheduleId"];
            timeZone: User["timeZone"];
        };
    };
    input: TUpdateInputSchema;
};
export declare const updateHandler: ({ input, ctx }: UpdateOptions) => Promise<{
    schedule: {
        name: string;
        id: number;
        userId: number;
    };
    isDefault: boolean;
    availability?: undefined;
    timeZone?: undefined;
    prevDefaultId?: undefined;
    currentDefaultId?: undefined;
} | {
    schedule: {
        eventType: {
            id: number;
            eventName: string | null;
        }[];
        availability: {
            id: number;
            userId: number | null;
            eventTypeId: number | null;
            startTime: Date;
            endTime: Date;
            scheduleId: number | null;
            days: number[];
            date: Date | null;
        }[];
        name: string;
        id: number;
        userId: number;
        timeZone: string | null;
    };
    availability: import("@calcom/types/schedule").Schedule;
    timeZone: string;
    isDefault: boolean;
    prevDefaultId: number | null;
    currentDefaultId: number | null;
}>;
export {};
