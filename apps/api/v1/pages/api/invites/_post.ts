import type { NextApiRequest, NextApiResponse } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultResponder } from "@calcom/lib/server/defaultResponder";
import prisma from "@calcom/prisma";
import { CreationSource } from "@calcom/prisma/enums";
import { createContext } from "@calcom/trpc/server/createContext";
import { viewerTeamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";
import type { TInviteMemberInputSchema } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.schema";
import { ZInviteMemberInputSchema } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/inviteMember.schema";
import { createCallerFactory } from "@calcom/trpc/server/trpc";
import type { UserProfile } from "@calcom/types/UserProfile";

import { TRPCError } from "@trpc/server";
import { getHTTPStatusCodeFromError } from "@trpc/server/http";

async function postHandler(req: NextApiRequest, res: NextApiResponse) {
  const data = ZInviteMemberInputSchema.parse(req.body);
  await checkPermissions(req, data);

  async function sessionGetter() {
    return {
      user: {
        id: req.userId,
        uuid: req.userUuid,
        username: "",
        profile: {
          id: null,
          organizationId: null,
          organization: null,
          username: "",
          upId: "",
        } satisfies UserProfile,
      },
      hasValidLicense: true,
      expires: "",
      upId: "",
    };
  }

  const ctx = await createContext({ req, res }, sessionGetter);
  try {
    const createCaller = createCallerFactory(viewerTeamsRouter);
    const caller = createCaller(ctx);
    await caller.inviteMember({
      role: data.role,
      language: data.language,
      teamId: data.teamId,
      usernameOrEmail: data.usernameOrEmail,
      creationSource: CreationSource.API_V1,
    });

    return { success: true, message: `${data.usernameOrEmail} has been invited.` };
  } catch (cause) {
    if (cause instanceof TRPCError) {
      const statusCode = getHTTPStatusCodeFromError(cause);
      throw new HttpError({ statusCode, message: cause.message });
    }

    throw cause;
  }
}

async function checkPermissions(req: NextApiRequest, body: TInviteMemberInputSchema) {
  const { userId, isSystemWideAdmin } = req;
  if (isSystemWideAdmin) return;
  // To prevent auto-accepted invites, limit it to ADMIN users
  if (!isSystemWideAdmin && "accepted" in body)
    throw new HttpError({ statusCode: 403, message: "ADMIN needed for `accepted`" });
  // Only team OWNERS and ADMINS can add other members
  const membership = await prisma.membership.findFirst({
    where: { userId, teamId: body.teamId, role: { in: ["ADMIN", "OWNER"] } },
  });
  if (!membership) throw new HttpError({ statusCode: 403, message: "You can't add members to this team" });
}

export default defaultResponder(postHandler);
