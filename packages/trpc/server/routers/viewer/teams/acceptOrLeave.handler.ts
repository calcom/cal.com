import { createAProfileForAnExistingUser } from "@calcom/lib/createAProfileForAnExistingUser";
import { updateNewTeamMemberEventTypes } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";
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
    const teamMembership = await TeamRepository.acceptMembership({
      userId: ctx.user.id,
      teamId: input.teamId,
    });

    const team = teamMembership.team;

    if (team.parentId) {
      await TeamRepository.acceptMembership({
        userId: ctx.user.id,
        teamId: team.parentId,
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
      const membership = await TeamRepository.declineMembership({
        userId: ctx.user.id,
        teamId: input.teamId,
      });

      if (membership.team.parentId) {
        await TeamRepository.declineMembership({
          userId: ctx.user.id,
          teamId: membership.team.parentId,
        });
      }
    } catch (e) {
      console.log(e);
    }
  }
};

export default acceptOrLeaveHandler;
