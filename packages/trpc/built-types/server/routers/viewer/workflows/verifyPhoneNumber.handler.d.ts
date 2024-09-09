import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";
import type { TVerifyPhoneNumberInputSchema } from "./verifyPhoneNumber.schema";
type VerifyPhoneNumberOptions = {
    ctx: {
        user: NonNullable<TrpcSessionUser>;
    };
    input: TVerifyPhoneNumberInputSchema;
};
export declare const verifyPhoneNumberHandler: ({ ctx, input }: VerifyPhoneNumberOptions) => Promise<boolean>;
export {};
