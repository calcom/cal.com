import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
type BookingUnconfirmedCountOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const bookingUnconfirmedCountHandler: ({ ctx }: BookingUnconfirmedCountOptions) => Promise<number>;
export {};
