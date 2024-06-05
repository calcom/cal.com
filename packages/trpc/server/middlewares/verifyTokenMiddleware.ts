import { symmetricDecrypt } from "@calcom/lib/crypto";

import { TRPCError } from "@trpc/server";

import { middleware } from "../trpc";

const verifyTokenMiddleware = middleware(async ({ ctx, next, input }) => {
  const token = (input as Record<string, unknown>).token as string;

  const decryptedEmail = symmetricDecrypt(
    decodeURIComponent(token),
    process.env.CALENDSO_ENCRYPTION_KEY || ""
  );

  const emailFromCtx = ctx.user?.email || "Email-less";

  if (decryptedEmail !== emailFromCtx) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid token" });
  }
  return await next();
});

export default verifyTokenMiddleware;
