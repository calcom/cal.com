import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";

type VerifyTokenOptions = {
  input: ZVerifyCodeInputSchema;
};

export const verifyCodeUnAuthenticatedHandler = async ({ input }: VerifyTokenOptions) => {
  const { email, code } = input;
  try {
    return await verifyCodeUnAuthenticated(email, code);
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });
  }
};
