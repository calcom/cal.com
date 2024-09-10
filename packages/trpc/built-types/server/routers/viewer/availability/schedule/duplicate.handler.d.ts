import type { TrpcSessionUser } from "../../../../trpc";
import type { TScheduleDuplicateSchema } from "./duplicate.schema";
type DuplicateScheduleOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TScheduleDuplicateSchema;
};
export declare const duplicateHandler: ({ ctx, input }: DuplicateScheduleOptions) => Promise<{
    schedule: {
        id: number;
        userId: number;
        timeZone: string | null;
        name: string;
    };
}>;
export {};
