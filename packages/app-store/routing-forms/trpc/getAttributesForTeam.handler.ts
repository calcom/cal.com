import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetAttributesForTeamInputSchema } from "./getAttributesForTeam.schema";
import {  getAttributesForTeam } from "../lib/getAttributes";

type GetAttributesForTeamHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAttributesForTeamInputSchema;
};

export default async function getAttributesForTeamHandler({
  ctx,
  input,
}: GetAttributesForTeamHandlerOptions) {
  const { teamId } = input;

  return getAttributesForTeam({ teamId });
}