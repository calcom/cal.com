import { randomBytes } from "crypto";

import { WEBAPP_URL } from "@calcom/lib/constants";
import { isTeamAdmin } from "@calcom/lib/server/queries/teams";
import { prisma } from "@calcom/prisma";
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

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `invite-link-for-teamId-${teamId}`,
      token,
      expires: new Date(new Date().setHours(168)), // +1 week,
      teamId,
    },
  });
  const isOrg = membership.team?.parentId !== null;

  async function getInviteLink() {
    const teamInviteLink = `${WEBAPP_URL}/teams?token=${token}`;
    const orgInviteLink = `${WEBAPP_URL}/signup?token=${token}&callbackUrl=/getting-started`;
    if (!isOrg) return teamInviteLink;
    // Only fetch if is not an org
    const orgMembers = await getMembersHandler({
      ctx,
      input: { teamIdToExclude: teamId, distinctUser: true },
    });
    if (!orgMembers) return teamInviteLink;
    if (orgMembers.length < 1) return teamInviteLink;
    return orgInviteLink;
  }

  return { token, inviteLink: await getInviteLink() };
};
