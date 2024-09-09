import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TGetCalVideoRecordingsInputSchema } from "./getCalVideoRecordings.schema";
type GetCalVideoRecordingsOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TGetCalVideoRecordingsInputSchema;
};
export declare const getCalVideoRecordingsHandler: ({ ctx: _ctx, input }: GetCalVideoRecordingsOptions) => Promise<{
    data: import("zod").objectOutputType<{
        id: import("zod").ZodString;
        room_name: import("zod").ZodString;
        start_ts: import("zod").ZodNumber;
        status: import("zod").ZodString;
        max_participants: import("zod").ZodOptional<import("zod").ZodNumber>;
        duration: import("zod").ZodNumber;
        share_token: import("zod").ZodString;
    }, import("zod").ZodTypeAny, "passthrough">[];
    total_count: number;
} | {} | undefined>;
export {};
