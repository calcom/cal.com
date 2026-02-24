import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import type { PrismaClient } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TSearchTeamMembersInputSchema } from "./searchTeamMembers.schema";

type SearchTeamMembersInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TSearchTeamMembersInputSchema;
};

export type TeamMemberSearchResult = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  username: string | null;
  defaultScheduleId: number | null;
  role: MembershipRole;
};

export type SearchTeamMembersResponse = {
  members: TeamMemberSearchResult[];
  nextCursor: number | undefined;
  hasMore: boolean;
};

export const searchTeamMembersHandler = async ({
  ctx,
  input,
}: SearchTeamMembersInput): Promise<SearchTeamMembersResponse> => {
  const { teamId, cursor, limit, search, memberUserIds } = input;
  const membershipRepo = new MembershipRepository(ctx.prisma);

  const isMember = await membershipRepo.hasMembership({ teamId, userId: ctx.user.id });
  if (!isMember) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You are not a member of this team" });
  }

  const { memberships, nextCursor, hasMore } = await membershipRepo.searchMembers({
    teamId,
    search,
    cursor,
    limit,
    memberUserIds,
  });

  const members: TeamMemberSearchResult[] = memberships.map((membership) => ({
    userId: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
    avatarUrl: membership.user.avatarUrl,
    username: membership.user.username,
    defaultScheduleId: membership.user.defaultScheduleId,
    role: membership.role,
  }));

  return { members, nextCursor, hasMore };
};
