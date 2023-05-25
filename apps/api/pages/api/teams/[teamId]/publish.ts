import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { MembershipRole } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { publishHandler } from "@calcom/trpc/server/routers/viewer/teams/publish.handler";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";

import authMiddleware, { checkPermissions } from "./_auth-middleware";

const patchHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  await checkPermissions(req, { in: [MembershipRole.OWNER, MembershipRole.ADMIN] });
  /** @see https://trpc.io/docs/server-side-calls */
  const ctx = await createContext({ req, res });
  const user = ctx.user;
  if (!user) {
    throw new Error("Internal Error.");
  }
  try {
    const { teamId } = schemaQueryTeamId.parse(req.query);
    return await publishHandler({ input: { teamId }, ctx: { ...ctx, user } });
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(cause);
      throw new HttpError({ statusCode, message: cause.message });
    }
    throw cause;
  }
};

export default withMiddleware()(
  defaultResponder(async (req: NextApiRequest, res: NextApiResponse) => {
    await authMiddleware(req);
    return defaultHandler({
      PATCH: Promise.resolve({ default: defaultResponder(patchHandler) }),
    })(req, res);
  })
);
