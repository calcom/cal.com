import type { TrpcSessionUser } from "../../../../trpc";
import type { TBulkUpdateToDefaultAvailabilityInputSchema } from "./bulkUpdateDefaultAvailability.schema";
type BulkUpdateToDefaultAvailabilityOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TBulkUpdateToDefaultAvailabilityInputSchema;
};
export declare const bulkUpdateToDefaultAvailabilityHandler: ({ ctx, input, }: BulkUpdateToDefaultAvailabilityOptions) => Promise<import("@prisma/client/runtime/library").GetBatchResult>;
export {};
