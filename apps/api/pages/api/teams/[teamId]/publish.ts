import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import { MembershipRole, UserPermissionRole } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

import { withMiddleware } from "~/lib/helpers/withMiddleware";

import authMiddleware, { checkPermissions } from "./_auth-middleware";

const patchHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  await checkPermissions(req, { in: [MembershipRole.OWNER, MembershipRole.ADMIN] });
  async function sessionGetter() {
    return {
      user: {
        id: req.userId,
        username: "" /* Not used in this context */,
        role: req.isAdmin ? UserPermissionRole.ADMIN : UserPermissionRole.USER,
      },
      hasValidLicense: true /* To comply with TS signature */,
      expires: "" /* Not used in this context */,
    };
  }
  /** @see https://trpc.io/docs/server-side-calls */
  const ctx = await createContext({ req, res }, sessionGetter);
  try {
    const caller = viewerTeamsRouter.createCaller(ctx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await caller.publish(req.query as any /* Let tRPC handle this */);
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
