import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

import { verifyCodeUnAuthenticated } from "./util";

type VerifyTokenOptions = {
  input: ZVerifyCodeInputSchema;
};

export const verifyCodeUnAuthenticatedHandler = async ({ input }: VerifyTokenOptions) => {
  const { email, code } = input;
  try {
    await verifyCodeUnAuthenticated(email, code);
    return true;
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });
  }
};
