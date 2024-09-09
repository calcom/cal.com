import type { TrpcSessionUser } from "../../../../trpc";
import type { TCreateInputSchema } from "./create.schema";
type CreateOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TCreateInputSchema;
};
export declare const createHandler: ({ input, ctx }: CreateOptions) => Promise<{
    schedule: {
        name: string;
        id: number;
        userId: number;
        timeZone: string | null;
    };
}>;
export {};
