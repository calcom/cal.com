import type { ServerResponse } from "node:http";
import { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import type { PrismaClient } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import type { NextApiResponse } from "next";
import type { TFindTeamMembersMatchingAttributeLogicInputSchema } from "./findTeamMembersMatchingAttributeLogic.schema";

interface FindTeamMembersMatchingAttributeLogicHandlerOptions {
  ctx: {
    prisma: PrismaClient;
    user: NonNullable<TrpcSessionUser>;
    res: ServerResponse | NextApiResponse | undefined;
  };
  input: TFindTeamMembersMatchingAttributeLogicInputSchema;
}

export const findTeamMembersMatchingAttributeLogicHandler = async ({
  ctx,
  input,
}: FindTeamMembersMatchingAttributeLogicHandlerOptions) => {
  const { teamId, attributesQueryValue, _enablePerf, _concurrency } = input;
  const orgId = ctx.user.organizationId;
  if (!orgId) {
    throw new Error("You must be in an organization to use this feature");
  }
  const {
    teamMembersMatchingAttributeLogic: matchingTeamMembersWithResult,
    mainAttributeLogicBuildingWarnings: mainWarnings,
    fallbackAttributeLogicBuildingWarnings: fallbackWarnings,
    troubleshooter,
  } = await findTeamMembersMatchingAttributeLogic(
    {
      teamId,
      attributesQueryValue,
      orgId,
    },
    {
      enablePerf: _enablePerf,
      enableTroubleshooter: _enablePerf,
      concurrency: _concurrency,
    }
  );

  if (!matchingTeamMembersWithResult) {
    return {
      troubleshooter,
      mainWarnings,
      fallbackWarnings,
      result: null,
    };
  }

  const matchingTeamMembersIds = matchingTeamMembersWithResult.map((member) => member.userId);
  const matchingTeamMembers = await new UserRepository(ctx.prisma).findByIds({ ids: matchingTeamMembersIds });

  return {
    mainWarnings,
    fallbackWarnings,
    troubleshooter: troubleshooter,
    result: matchingTeamMembers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
    })),
  };
};

export default findTeamMembersMatchingAttributeLogicHandler;
