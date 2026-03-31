import { PrismaMembershipRepository } from "@calcom/features/membership/repositories/PrismaMembershipRepository";
import {
  MembershipService,
  type AllTeamMembersResponse,
} from "@calcom/features/membership/services/MembershipService";
import type { PrismaClient } from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetAllTeamMembersInputSchema } from "./getAllTeamMembers.schema";

type GetAllTeamMembersInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetAllTeamMembersInputSchema;
};

export type { AllTeamMembersResponse as GetAllTeamMembersResponse };

export const getAllTeamMembersHandler = async ({
  ctx,
  input,
}: GetAllTeamMembersInput): Promise<AllTeamMembersResponse> => {
  const eventType = await ctx.prisma.eventType.findUnique({
    where: { id: input.eventTypeId },
    select: { teamId: true },
  });

  if (!eventType) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event type not found" });
  }

  if (!eventType.teamId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Event type is not a team event" });
  }
  const membershipRepository = new PrismaMembershipRepository(ctx.prisma);
  const membershipService = new MembershipService(membershipRepository);
  return membershipService.getAllTeamMembers({ teamId: eventType.teamId });
};
