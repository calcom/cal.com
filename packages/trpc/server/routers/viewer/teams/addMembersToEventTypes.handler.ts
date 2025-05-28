import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
import { TeamRepository } from "@calcom/lib/server/repository/team";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TAddMembersToEventTypes } from "./addMembersToEventTypes.schema";

type AddBulkToEventTypeHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAddMembersToEventTypes;
};

export async function addMembersToEventTypesHandler({ ctx, input }: AddBulkToEventTypeHandler) {
  const { eventTypeIds, userIds, teamId } = input;

  const isTeamAdminOrOwner =
    (await isTeamAdmin(ctx.user.id, teamId)) || (await isTeamOwner(ctx.user.id, teamId));

  // check if user is admin or owner of team
  if (!isTeamAdminOrOwner) throw new TRPCError({ code: "UNAUTHORIZED" });

  return await TeamRepository.addMembersToEventTypes({
    eventTypeIds,
    userIds,
  });
}

export default addMembersToEventTypesHandler;
