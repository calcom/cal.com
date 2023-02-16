import { MembershipRole, UserPermissionRole } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerRouter } from "@calcom/trpc/server/routers/viewer";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { withMiddleware } from "~/lib/helpers/withMiddleware";
import { schemaQueryTeamId } from "~/lib/validations/shared/queryTeamId";

import authMiddleware, { checkPermissions } from "./_auth-middleware";

const patchHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { isAdmin } = req;
  await checkPermissions(req, { in: [MembershipRole.OWNER, MembershipRole.ADMIN] });

  /** We shape the session as required by tRPC rounter */
  async function sessionGetter() {
    return {
      user: {
        id: req.userId,
        username: "" /* Not used in this context */,
        role: isAdmin ? UserPermissionRole.ADMIN : UserPermissionRole.USER,
      },
      hasValidLicense: true,
      expires: "" /* Not used in this context */,
    };
  }

  /** @see https://trpc.io/docs/server-side-calls */
  const ctx = await createContext({ req, res }, sessionGetter);
  const caller = viewerRouter.createCaller(ctx);
  try {
    const { teamId } = schemaQueryTeamId.parse(req.query);
    return await caller.teams.publish({ teamId });
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
