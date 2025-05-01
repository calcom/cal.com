import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TAcceptOrLeaveInputSchema } from "./acceptOrLeave.schema";

type AcceptOrLeaveOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAcceptOrLeaveInputSchema;
};

export const acceptOrLeaveHandler = async ({ ctx, input }: AcceptOrLeaveOptions) => {
  if (input.accept) {
    const teamMembership = await prisma.membership.update({
      where: {
        userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
      },
      data: {
        accepted: true,
      },
      include: {
        team: true,
      },
    });

    const team = teamMembership.team;

    if (team.parentId) {
      await prisma.membership.update({
        where: {
          userId_teamId: { userId: ctx.user.id, teamId: team.parentId },
        },
        data: {
          accepted: true,
        },
        include: {
          team: true,
        },
      });
    }

    const isASubteam = team.parentId !== null;
    const idOfOrganizationInContext = team.isOrganization ? team.id : isASubteam ? team.parentId : null;
    const needProfileUpdate = !!idOfOrganizationInContext;
    if (needProfileUpdate) {
      await createAProfileForAnExistingUser({
        user: {
          id: ctx.user.id,
          email: ctx.user.email,
          currentUsername: ctx.user.username,
        },
        organizationId: idOfOrganizationInContext,
      });
    }
    await updateNewTeamMemberEventTypes(ctx.user.id, input.teamId);
  } else {
    try {
      const membership = await prisma.membership.delete({
        where: {
          userId_teamId: { userId: ctx.user.id, teamId: input.teamId },
        },
        include: {
          team: true,
        },
      });

      if (membership.team.parentId) {
        await prisma.membership.delete({
          where: {
            userId_teamId: { userId: ctx.user.id, teamId: membership.team.parentId },
          },
        });
      }
    } catch (e) {
      console.log(e);
    }
  }
};

export default acceptOrLeaveHandler;
