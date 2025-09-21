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
    const teamMembership = await prisma.calIdMembership.update({
      where: {
        userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: input.teamId },
      },
      data: {
        acceptedInvitation: true,
      },
      include: {
        calIdTeam: true,
      },
    });

    // const team = teamMembership.calIdTeam;

    // if (team.parentId) {
    //   await prisma.calIdMembership.update({
    //     where: {
    //       userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: team.parentId },
    //     },
    //     data: {
    //       accepted: true,
    //     },
    //   });
    // }

    // const isASubteam = team.parentId !== null;
    // const idOfOrganizationInContext = team.isOrganization ? team.id : isASubteam ? team.parentId : null;
    // if (idOfOrganizationInContext) {
    //   await prisma.profile.upsert({
    //     where: { userId_organizationId: { userId: ctx.user.id, organizationId: idOfOrganizationInContext } },
    //     update: {},
    //     create: {
    //       userId: ctx.user.id,
    //       organizationId: idOfOrganizationInContext,
    //       email: ctx.user.email,
    //       username: ctx.user.username,
    //     },
    //   });
    // }
    //   } else {
    // try {
    //   const membership = await prisma.calIdMembership.delete({
    //     where: {
    //       userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: input.teamId },
    //     },
    //     include: {
    //       calIdTeam: true,
    //     },
    //   });

    //   //   if (membership.calIdTeam.parentId) {
    //   //     await prisma.calIdMembership.delete({
    //   //       where: {
    //   //         userId_calIdTeamId: { userId: ctx.user.id, calIdTeamId: membership.calIdTeam.parentId },
    //   //       },
    //   //     });
    //   //   }
    // } catch (e) {
    //   console.error(e);
    // }
  }
};

export default acceptOrLeaveHandler;
