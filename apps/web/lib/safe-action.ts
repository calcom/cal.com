"use server";

import { createSafeActionClient } from "next-safe-action";
import { cookies, headers } from "next/headers";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import prisma, { readonlyPrisma } from "@calcom/prisma";
import { getUserFromSession } from "@calcom/trpc/server/middlewares/sessionMiddleware";

import { buildLegacyRequest } from "./buildLegacyCtx";

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export const actionClient = createSafeActionClient({
  handleServerError(e: Error) {
    if (e instanceof ActionError) {
      return e.message;
    }
    return "Something went wrong";
  },
});

export const authedActionClient = actionClient.use(async ({ next }) => {
  const req = buildLegacyRequest(await headers(), await cookies());
  const session = await getServerSession({ req });

  if (!session?.user?.id) {
    throw new ActionError("Not authenticated");
  }

  const user = await getUserFromSession({ req, prisma, insightsDb: readonlyPrisma, locale: "en" }, session);

  if (!user) {
    throw new ActionError("Not authenticated");
  }

  return next({ ctx: { user, session, prisma } });
});

export const eventOwnerActionClient = authedActionClient.use(async ({ ctx, next }) => {
  return next({ ctx });
});
