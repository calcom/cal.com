import type { TrpcSessionUser } from "../../../trpc";
import type { TConfirmInputSchema } from "./confirm.schema";
type ConfirmOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TConfirmInputSchema;
};
export declare const confirmHandler: ({ ctx, input }: ConfirmOptions) => Promise<{
    message: string;
    status: "ACCEPTED" | "REJECTED";
} | null>;
export {};
