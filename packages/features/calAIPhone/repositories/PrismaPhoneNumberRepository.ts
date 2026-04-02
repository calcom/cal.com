import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

interface _PhoneNumberRawResult {
  id: number;
  phoneNumber: string;
  provider: string | null;
  userId: number | null;
  teamId: number | null;
  subscriptionStatus: string | null;
  createdAt: Date;
  updatedAt: Date;
  inboundAgentId: string | null;
  outboundAgentId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface AgentRawResult {
  id: string;
  name: string;
  providerAgentId: string;
}

export class PrismaPhoneNumberRepository {
  constructor(private prismaClient: PrismaClient) {}

  private async getUserAccessibleTeamIds(userId: number): Promise<number[]> {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
      select: {
        teamId: true,
      },
    });

    return memberships.map((membership) => membership.teamId);
  }

  async findByPhoneNumberAndUserId({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await this.prismaClient.calAiPhoneNumber.findFirstOrThrow({
      where: {
        phoneNumber,
        userId,
      },
      select: {
        id: true,
        phoneNumber: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        provider: true,
        inboundAgentId: true,
        outboundAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    const phoneNumbers = await this.prismaClient.$queryRaw<_PhoneNumberRawResult[]>`
      SELECT
        pn.id,
        pn."phoneNumber",
        pn.provider,
        pn."userId",
        pn."teamId",
        pn."subscriptionStatus",
        pn."createdAt",
        pn."updatedAt",
        pn."inboundAgentId",
        pn."outboundAgentId",
        pn."stripeCustomerId",
        pn."stripeSubscriptionId"
      FROM "CalAiPhoneNumber" pn
      WHERE pn."userId" = ${userId}
        AND (pn."subscriptionStatus" = ${PhoneNumberSubscriptionStatus.ACTIVE} OR pn."subscriptionStatus" IS NULL)
    `;

    const phoneNumberIds = phoneNumbers.map((pn) => pn.id);
    const agents =
      phoneNumberIds.length > 0
        ? await this.prismaClient.$queryRaw<
            (AgentRawResult & { phoneNumberId: number; agentType: string })[]
          >`
        SELECT
          a.id,
          a.name,
          a."providerAgentId",
          pn.id as "phoneNumberId",
          CASE
            WHEN pn."inboundAgentId" = a.id THEN 'inbound'
            WHEN pn."outboundAgentId" = a.id THEN 'outbound'
          END as "agentType"
        FROM "Agent" a
        INNER JOIN "CalAiPhoneNumber" pn ON (pn."inboundAgentId" = a.id OR pn."outboundAgentId" = a.id)
        WHERE pn.id IN (${Prisma.join(phoneNumberIds)})
      `
        : [];

    const agentsByPhoneNumber = agents.reduce(
      (acc, agent) => {
        const phoneNumberId = agent.phoneNumberId;
        if (!acc[phoneNumberId]) {
          acc[phoneNumberId] = { inbound: null, outbound: null };
        }

        const agentData = {
          id: agent.id,
          name: agent.name,
          providerAgentId: agent.providerAgentId,
        };

        if (agent.agentType === "inbound") {
          acc[phoneNumberId].inbound = agentData;
        } else if (agent.agentType === "outbound") {
          acc[phoneNumberId].outbound = agentData;
        }

        return acc;
      },
      {} as Record<number, { inbound: AgentRawResult | null; outbound: AgentRawResult | null }>
    );

    return phoneNumbers.map((pn) => ({
      id: pn.id,
      phoneNumber: pn.phoneNumber,
      provider: pn.provider,
      userId: pn.userId,
      teamId: pn.teamId,
      subscriptionStatus: pn.subscriptionStatus,
      createdAt: pn.createdAt,
      updatedAt: pn.updatedAt,
      stripeCustomerId: pn.stripeCustomerId,
      stripeSubscriptionId: pn.stripeSubscriptionId,
      inboundAgent: agentsByPhoneNumber[pn.id]?.inbound || null,
      outboundAgent: agentsByPhoneNumber[pn.id]?.outbound || null,
    }));
  }

  async createPhoneNumber({
    phoneNumber,
    provider,
    userId,
    teamId,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    providerPhoneNumberId,
  }: {
    phoneNumber: string;
    provider: string;
    userId: number;
    teamId?: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionStatus?: PhoneNumberSubscriptionStatus;
    providerPhoneNumberId?: string;
  }) {
    return await this.prismaClient.calAiPhoneNumber.create({
      select: {
        id: true,
        phoneNumber: true,
        provider: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        inboundAgentId: true,
        outboundAgentId: true,
        providerPhoneNumberId: true,
      },
      data: {
        provider,
        userId,
        teamId,
        phoneNumber,
        stripeCustomerId,
        stripeSubscriptionId,
        subscriptionStatus,
        providerPhoneNumberId,
      },
    });
  }

  async deletePhoneNumber({ phoneNumber }: { phoneNumber: string }) {
    return await this.prismaClient.calAiPhoneNumber.delete({
      where: {
        phoneNumber,
      },
    });
  }

  async findByStripeSubscriptionId({ stripeSubscriptionId }: { stripeSubscriptionId: string }) {
    return await this.prismaClient.calAiPhoneNumber.findFirst({
      where: {
        stripeSubscriptionId,
      },
      select: {
        id: true,
        phoneNumber: true,
        provider: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });
  }

  async findByIdAndUserId({ id, userId }: { id: number; userId: number }) {
    return await this.prismaClient.calAiPhoneNumber.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
        phoneNumber: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        provider: true,
        inboundAgentId: true,
        outboundAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByIdWithTeamAccess({ id, teamId, userId }: { id: number; teamId: number; userId: number }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    if (!accessibleTeamIds.includes(teamId)) {
      return null;
    }

    return await this.prismaClient.calAiPhoneNumber.findFirst({
      where: {
        id,
        teamId,
      },
      select: {
        id: true,
        phoneNumber: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        provider: true,
        inboundAgentId: true,
        outboundAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findByPhoneNumberAndTeamId({
    phoneNumber,
    teamId,
    userId,
  }: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    if (!accessibleTeamIds.includes(teamId)) {
      return null;
    }

    return await this.prismaClient.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber,
        teamId,
      },
      select: {
        id: true,
        phoneNumber: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        stripeSubscriptionId: true,
        stripeCustomerId: true,
        provider: true,
        inboundAgentId: true,
        outboundAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findManyWithUserAccess({
    userId,
    teamId,
    scope = "all",
  }: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }) {
    let whereCondition: Prisma.Sql;

    if (scope === "personal") {
      whereCondition = Prisma.sql`pn."userId" = ${userId}`;
    } else if (scope === "team") {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

      if (accessibleTeamIds.length === 0) {
        return [];
      }

      if (teamId) {
        if (!accessibleTeamIds.includes(teamId)) {
          return [];
        }
        whereCondition = Prisma.sql`pn."teamId" = ${teamId}`;
      } else {
        whereCondition = Prisma.sql`pn."teamId" IN (${Prisma.join(accessibleTeamIds)})`;
      }
    } else {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

      if (teamId) {
        if (accessibleTeamIds.includes(teamId)) {
          whereCondition = Prisma.sql`(pn."userId" = ${userId} OR pn."teamId" = ${teamId})`;
        } else {
          whereCondition = Prisma.sql`pn."userId" = ${userId}`;
        }
      } else if (accessibleTeamIds.length > 0) {
        whereCondition = Prisma.sql`(pn."userId" = ${userId} OR pn."teamId" IN (${Prisma.join(
          accessibleTeamIds
        )}))`;
      } else {
        whereCondition = Prisma.sql`pn."userId" = ${userId}`;
      }
    }

    const query = Prisma.sql`
      SELECT
        pn.id,
        pn."phoneNumber",
        pn.provider,
        pn."userId",
        pn."teamId",
        pn."subscriptionStatus",
        pn."createdAt",
        pn."updatedAt",
        pn."inboundAgentId",
        pn."outboundAgentId",
        pn."stripeCustomerId",
        pn."stripeSubscriptionId"
      FROM "CalAiPhoneNumber" pn
      WHERE ${whereCondition}
      ORDER BY pn."createdAt" DESC
    `;

    const phoneNumbers = await this.prismaClient.$queryRaw<_PhoneNumberRawResult[]>(query);

    const phoneNumberIds = phoneNumbers.map((pn) => pn.id);
    const agents =
      phoneNumberIds.length > 0
        ? await this.prismaClient.$queryRaw<
            (AgentRawResult & { phoneNumberId: number; agentType: string })[]
          >`
        SELECT
          a.id,
          a.name,
          a."providerAgentId",
          pn.id as "phoneNumberId",
          CASE
            WHEN pn."inboundAgentId" = a.id THEN 'inbound'
            WHEN pn."outboundAgentId" = a.id THEN 'outbound'
          END as "agentType"
        FROM "Agent" a
        INNER JOIN "CalAiPhoneNumber" pn ON (pn."inboundAgentId" = a.id OR pn."outboundAgentId" = a.id)
        WHERE pn.id IN (${Prisma.join(phoneNumberIds)})
      `
        : [];

    const agentsByPhoneNumber = agents.reduce(
      (acc, agent) => {
        const phoneNumberId = agent.phoneNumberId;
        if (!acc[phoneNumberId]) {
          acc[phoneNumberId] = { inbound: null, outbound: null };
        }

        const agentData = {
          id: agent.id,
          name: agent.name,
          providerAgentId: agent.providerAgentId,
        };

        if (agent.agentType === "inbound") {
          acc[phoneNumberId].inbound = agentData;
        } else if (agent.agentType === "outbound") {
          acc[phoneNumberId].outbound = agentData;
        }

        return acc;
      },
      {} as Record<number, { inbound: AgentRawResult | null; outbound: AgentRawResult | null }>
    );

    return phoneNumbers.map((pn) => ({
      id: pn.id,
      phoneNumber: pn.phoneNumber,
      provider: pn.provider,
      userId: pn.userId,
      teamId: pn.teamId,
      subscriptionStatus: pn.subscriptionStatus,
      createdAt: pn.createdAt,
      updatedAt: pn.updatedAt,
      stripeCustomerId: pn.stripeCustomerId,
      stripeSubscriptionId: pn.stripeSubscriptionId,
      inboundAgent: agentsByPhoneNumber[pn.id]?.inbound || null,
      outboundAgent: agentsByPhoneNumber[pn.id]?.outbound || null,
    }));
  }

  async updateSubscriptionStatus({
    id,
    subscriptionStatus,
    disconnectAgents = false,
  }: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectAgents?: boolean;
  }) {
    const updateData: Prisma.CalAiPhoneNumberUpdateInput = {
      subscriptionStatus,
    };

    if (disconnectAgents) {
      updateData.outboundAgent = {
        disconnect: true,
      };
      updateData.inboundAgent = {
        disconnect: true,
      };
    }

    return await this.prismaClient.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  async updateAgents({
    id,
    inboundProviderAgentId,
    outboundProviderAgentId,
  }: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }) {
    const updateData: Prisma.CalAiPhoneNumberUpdateInput = {};

    if (inboundProviderAgentId !== undefined) {
      if (inboundProviderAgentId) {
        const agent = await this.prismaClient.agent.findFirst({
          where: {
            providerAgentId: inboundProviderAgentId,
          },
        });

        if (agent) {
          updateData.inboundAgent = {
            connect: { id: agent.id },
          };
        } else {
          updateData.inboundAgent = { disconnect: true };
        }
      } else {
        updateData.inboundAgent = { disconnect: true };
      }
    }

    if (outboundProviderAgentId !== undefined) {
      if (outboundProviderAgentId) {
        const agent = await this.prismaClient.agent.findFirst({
          where: {
            providerAgentId: outboundProviderAgentId,
          },
        });

        if (agent) {
          updateData.outboundAgent = {
            connect: { id: agent.id },
          };
        } else {
          updateData.outboundAgent = { disconnect: true };
        }
      } else {
        updateData.outboundAgent = { disconnect: true };
      }
    }

    return await this.prismaClient.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  async updateInboundAgentId({ id, agentId }: { id: number; agentId: string }) {
    // Atomic update: only set if inboundAgentId is currently null
    return await this.prismaClient.calAiPhoneNumber.updateMany({
      where: {
        id,
        inboundAgentId: null,
      },
      data: { inboundAgentId: agentId },
    });
  }

  async findInboundAgentIdByPhoneNumberId({ phoneNumberId }: { phoneNumberId: number }) {
    return await this.prismaClient.calAiPhoneNumber.findUnique({
      where: { id: phoneNumberId },
      select: { inboundAgentId: true },
    });
  }

  async findByPhoneNumber({ phoneNumber }: { phoneNumber: string }) {
    return await this.prismaClient.calAiPhoneNumber.findFirst({
      where: {
        phoneNumber,
      },
      select: {
        id: true,
        phoneNumber: true,
        userId: true,
        teamId: true,
        user: { select: { id: true, email: true, name: true } },
        team: { select: { id: true, name: true, parentId: true } },
      },
    });
  }
}
