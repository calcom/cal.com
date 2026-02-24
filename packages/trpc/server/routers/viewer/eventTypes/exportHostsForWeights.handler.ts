import { findTeamMembersMatchingAttributeLogic } from "@calcom/features/routing-forms/lib/findTeamMembersMatchingAttributeLogic";
import { HostRepository } from "@calcom/features/host/repositories/HostRepository";
import type { PrismaClient } from "@calcom/prisma/client";

import type { TrpcSessionUser } from "../../../types";
import type { TExportHostsForWeightsInputSchema } from "./exportHostsForWeights.schema";

type ExportHostsForWeightsInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TExportHostsForWeightsInputSchema;
};

export type ExportedWeightMember = {
  userId: number;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  weight: number | null;
};

export type ExportHostsForWeightsResponse = {
  members: ExportedWeightMember[];
};

async function getSegmentMemberIds(
  ctx: ExportHostsForWeightsInput["ctx"],
  input: ExportHostsForWeightsInput["input"]
): Promise<Set<number> | null> {
  if (!input.assignRRMembersUsingSegment || !input.attributesQueryValue || !input.teamId) {
    return null;
  }

  const orgId = ctx.user.organizationId;
  if (!orgId) return null;

  const { teamMembersMatchingAttributeLogic } = await findTeamMembersMatchingAttributeLogic(
    {
      teamId: input.teamId,
      attributesQueryValue: input.attributesQueryValue,
      orgId,
    },
    { enablePerf: false }
  );

  if (!teamMembersMatchingAttributeLogic) return null;

  return new Set(teamMembersMatchingAttributeLogic.map((m) => m.userId));
}

export const exportHostsForWeightsHandler = async ({
  ctx,
  input,
}: ExportHostsForWeightsInput): Promise<ExportHostsForWeightsResponse> => {
  const segmentMemberIds = await getSegmentMemberIds(ctx, input);

  if (input.assignAllTeamMembers && input.teamId) {
    // Fetch all accepted team members
    const memberships = await ctx.prisma.membership.findMany({
      where: {
        teamId: input.teamId,
        accepted: true,
      },
      orderBy: { user: { id: "asc" } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    let members: ExportedWeightMember[] = memberships.map((m) => ({
      userId: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatarUrl: m.user.avatarUrl,
      weight: null,
    }));

    if (segmentMemberIds) {
      members = members.filter((m) => segmentMemberIds.has(m.userId));
    }

    return { members };
  }

  // Fetch all non-fixed hosts for this event type
  const hostRepository = new HostRepository(ctx.prisma);
  const hosts = await hostRepository.findAllRoundRobinHosts({ eventTypeId: input.eventTypeId });

  let members: ExportedWeightMember[] = hosts.map((h) => ({
    userId: h.userId,
    name: h.user.name,
    email: h.user.email,
    avatarUrl: h.user.avatarUrl,
    weight: h.weight ?? 100,
  }));

  if (segmentMemberIds) {
    members = members.filter((m) => segmentMemberIds.has(m.userId));
  }

  return { members };
};
