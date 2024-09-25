import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetTeamMembersQueryBuilderConfigInputSchema } from "./getAttributesForTeam.schema";
import {  getAttributesForTeam } from "../lib/getAttributes";

type GetTeamMembersQueryBuilderConfigOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamMembersQueryBuilderConfigInputSchema;
};

export default async function getAttributesForTeamHandler({
  ctx,
  input,
}: GetTeamMembersQueryBuilderConfigOptions) {
  const { user } = ctx;
  const { teamId } = input;

  if (!user.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return getAttributesForTeam({ teamId });
}