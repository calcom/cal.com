import type { ZVerifyCodeInputSchema } from "@calcom/prisma/zod-utils";

import { verifyCodeUnAuthenticated } from "./util";

type VerifyTokenOptions = {
  input: ZVerifyCodeInputSchema;
};

export const verifyCodeUnAuthenticatedHandler = async ({ input }: VerifyTokenOptions) => {
  const { email, code } = input;
  try {
    const isValidToken = await verifyCodeUnAuthenticated(email, code);
    return isValidToken;
  } catch (error) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "invalid_code" });
  }
};
