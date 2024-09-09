import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listHandler: ({ ctx }: ListOptions) => Promise<{
    schedules: {
        isDefault: boolean;
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
        timeZone: string | null;
    }[];
}>;
export {};
