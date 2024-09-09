import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TSubmitFeedbackInputSchema } from "./submitFeedback.schema";
type SubmitFeedbackOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TSubmitFeedbackInputSchema;
};
export declare const submitFeedbackHandler: ({ ctx, input }: SubmitFeedbackOptions) => Promise<void>;
export {};
