import { randomBytes } from "crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@calcom/trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { getMembersHandler } from "../organizations/getMembers.handler";
import type { TCreateInviteInputSchema } from "./createInvite.schema";

type CreateInviteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCreateInviteInputSchema;
};

export const createInviteHandler = async ({ ctx, input }: CreateInviteOptions) => {
  const { teamId } = input;
  const membership = await isTeamAdmin(ctx.user.id, teamId);

  if (!membership || !membership?.team) throw new TRPCError({ code: "UNAUTHORIZED" });
  const teamMetadata = teamMetadataSchema.parse(membership.team.metadata);
  const isOrg = !!(membership.team?.parentId === null && teamMetadata?.isOrganization);
  const orgMembers = await getMembersHandler({
    ctx,
    input: { teamIdToExclude: teamId, distinctUser: true },
  });

  if (input.token) {
    const existingToken = await prisma.verificationToken.findFirst({
      where: { token: input.token, identifier: `invite-link-for-teamId-${teamId}`, teamId },
    });
    if (!existingToken) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      token: existingToken.token,
      inviteLink: await getInviteLink(existingToken.token, isOrg, orgMembers?.length),
    };
  }

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `invite-link-for-teamId-${teamId}`,
      token,
      expires: new Date(new Date().setHours(168)), // +1 week,
      teamId,
    },
  });

  return { token, inviteLink: await getInviteLink(token, isOrg, orgMembers?.length) };
};

async function getInviteLink(token = "", isOrg = false, orgMembers = 0) {
  const teamInviteLink = `${WEBAPP_URL}/teams?token=${token}`;
  const orgInviteLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
  if (isOrg || orgMembers > 0) return orgInviteLink;
  return teamInviteLink;
}

export default createInviteHandler;
