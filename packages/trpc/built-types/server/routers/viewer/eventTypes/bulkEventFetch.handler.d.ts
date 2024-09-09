import type { TrpcSessionUser } from "../../../trpc";
type BulkEventFetchOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
};
export declare const bulkEventFetchHandler: ({ ctx }: BulkEventFetchOptions) => Promise<{
    eventTypes: {
        logo: string | undefined;
        id: number;
        title: string;
        locations: import(".prisma/client").Prisma.JsonValue;
    }[];
}>;
export {};
