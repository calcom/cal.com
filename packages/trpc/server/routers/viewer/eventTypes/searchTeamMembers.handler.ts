import { EventTypeHostService } from "@calcom/features/host/services/EventTypeHostService";
import type { PaginatedTeamMembersResponse } from "@calcom/features/host/services/IEventTypeHostService";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TSearchTeamMembersInputSchema } from "./searchTeamMembers.schema";

type SearchTeamMembersInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TSearchTeamMembersInputSchema;
};

export type { PaginatedTeamMembersResponse as SearchTeamMembersResponse };
export type { TeamMemberSearchResult } from "@calcom/features/host/services/IEventTypeHostService";

export const searchTeamMembersHandler = async ({
  ctx,
  input,
}: SearchTeamMembersInput): Promise<PaginatedTeamMembersResponse> => {
  const service = new EventTypeHostService(ctx.prisma);
  return service.searchTeamMembers({
    teamId: input.teamId,
    userId: ctx.user.id,
    cursor: input.cursor,
    limit: input.limit,
    search: input.search,
    memberUserIds: input.memberUserIds,
  });
};
