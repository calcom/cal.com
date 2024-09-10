import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type GetTravelSchedulesOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const getTravelSchedulesHandler: ({ ctx }: GetTravelSchedulesOptions) => Promise<{
    id: number;
    timeZone: string;
    endDate: Date | null;
    startDate: Date;
}[]>;
export {};
