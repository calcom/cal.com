import type { TrpcSessionUser } from "../../../trpc";
type ListOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const listHandler: ({ ctx }: ListOptions) => Promise<{
    schedules: {
        isDefault: boolean;
        id: number;
        timeZone: string | null;
        availability: {
            date: Date | null;
            days: number[];
            id: number;
            userId: number | null;
            scheduleId: number | null;
            eventTypeId: number | null;
            startTime: Date;
            endTime: Date;
        }[];
        name: string;
    }[];
}>;
export {};
