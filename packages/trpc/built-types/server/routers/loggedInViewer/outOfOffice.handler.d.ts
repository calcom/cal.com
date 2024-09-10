import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TOutOfOfficeDelete, TOutOfOfficeInputSchema } from "./outOfOffice.schema";
type TBookingRedirect = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TOutOfOfficeInputSchema;
};
export declare const outOfOfficeCreateOrUpdate: ({ ctx, input }: TBookingRedirect) => Promise<{} | undefined>;
type TBookingRedirectDelete = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TOutOfOfficeDelete;
};
export declare const outOfOfficeEntryDelete: ({ ctx, input }: TBookingRedirectDelete) => Promise<{}>;
export declare const outOfOfficeEntriesList: ({ ctx }: {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
}) => Promise<{
    id: number;
    notes: string | null;
    end: Date;
    start: Date;
    reason: {
        id: number;
        userId: number | null;
        reason: string;
        emoji: string;
    } | null;
    uuid: string;
    toUserId: number | null;
    toUser: {
        username: string | null;
    } | null;
}[]>;
export {};
