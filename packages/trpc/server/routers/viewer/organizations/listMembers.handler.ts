import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListMembersInputSchema } from "./schema";
import { findCurrentOrganizationMembership } from "./organizationUtils";

type ListMembersHandlerOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id">;
  };
  input: TListMembersInputSchema;
};

export const listMembersHandler = async ({ ctx, input }: ListMembersHandlerOptions) => {
  const membership = await findCurrentOrganizationMembership({ userId: ctx.user.id });

  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const repo = new MembershipRepository();
  return repo.searchMembers({
    teamId: membership.team.id,
    search: input.search,
    cursor: input.cursor,
    limit: input.limit ?? 20,
  });
};
