import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
type VerifyTokenOptions = {
    input: ZVerifyCodeInputSchema;
};
export declare const verifyCodeUnAuthenticatedHandler: ({ input }: VerifyTokenOptions) => Promise<true>;
export {};
