import type { TrpcSessionUser } from "../../../trpc";
import type { TBulkUpdateToDefaultLocationInputSchema } from "./bulkUpdateToDefaultLocation.schema";
type BulkUpdateToDefaultLocationOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TBulkUpdateToDefaultLocationInputSchema;
};
export declare const bulkUpdateToDefaultLocationHandler: ({ ctx, input, }: BulkUpdateToDefaultLocationOptions) => Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export {};
