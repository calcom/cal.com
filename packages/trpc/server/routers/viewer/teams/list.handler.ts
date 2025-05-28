import { TeamRepository } from "@calcom/lib/server/repository/team";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import type { TrpcSessionUser } from "../../../types";
import type { TGetListSchema } from "./list.schema";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetListSchema;
};

export const listHandler = async ({ ctx, input }: ListOptions) => {
  const memberships = await TeamRepository.listUserTeams({
    userId: ctx.user.id,
  });

  return memberships
    .filter((mmship) => {
      if (input?.includeOrgs) return true;
      return !mmship.team.isOrganization;
    })
    .map(({ team: { inviteTokens, ...team }, ...membership }) => ({
      role: membership.role,
      accepted: membership.accepted,
      ...team,
      metadata: teamMetadataSchema.parse(team.metadata),
      /** To prevent breaking we only return non-email attached token here, if we have one */
      inviteToken: inviteTokens.find((token) => token.identifier === `invite-link-for-teamId-${team.id}`),
    }));
};

export default listHandler;
