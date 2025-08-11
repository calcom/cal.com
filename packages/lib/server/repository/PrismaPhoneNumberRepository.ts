import { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
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
  private static async getUserAccessibleTeamIds(userId: number): Promise<number[]> {
    const memberships = await prisma.membership.findMany({
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

  static async findByPhoneNumberAndUserId({ phoneNumber, userId }: { phoneNumber: string; userId: number }) {
    return await prisma.calAiPhoneNumber.findFirstOrThrow({
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

  static async findPhoneNumbersFromUserId({ userId }: { userId: number }) {
    const phoneNumbers = await prisma.$queryRaw<_PhoneNumberRawResult[]>`
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
        ? await prisma.$queryRaw<(AgentRawResult & { phoneNumberId: number; agentType: string })[]>`
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

    const agentsByPhoneNumber = agents.reduce((acc, agent) => {
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
    }, {} as Record<number, { inbound: AgentRawResult | null; outbound: AgentRawResult | null }>);

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

  static async createPhoneNumber({
    phoneNumber,
    provider,
    userId,
    teamId,
  }: {
    phoneNumber: string;
    provider?: string;
    userId: number;
    teamId?: number;
  }) {
    return await prisma.calAiPhoneNumber.create({
      select: {
        id: true,
        phoneNumber: true,
        provider: true,
        userId: true,
        teamId: true,
        subscriptionStatus: true,
        createdAt: true,
        updatedAt: true,
      },
      data: {
        provider,
        userId,
        teamId,
        phoneNumber,
      },
    });
  }

  static async deletePhoneNumber({ phoneNumber }: { phoneNumber: string }) {
    return await prisma.calAiPhoneNumber.delete({
      where: {
        phoneNumber,
      },
    });
  }

  static async findByIdAndUserId({ id, userId }: { id: number; userId: number }) {
    return await prisma.calAiPhoneNumber.findFirst({
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

  static async findByIdWithTeamAccess({
    id,
    teamId,
    userId,
  }: {
    id: number;
    teamId: number;
    userId: number;
  }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    if (!accessibleTeamIds.includes(teamId)) {
      return null;
    }

    return await prisma.calAiPhoneNumber.findFirst({
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

  static async findByPhoneNumberAndTeamId({
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

    return await prisma.calAiPhoneNumber.findFirst({
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
        stripeCustomerId: true,
        provider: true,
        inboundAgentId: true,
        outboundAgentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async findManyWithUserAccess({
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

    const phoneNumbers = await prisma.$queryRaw<_PhoneNumberRawResult[]>`
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

    const phoneNumberIds = phoneNumbers.map((pn) => pn.id);
    const agents =
      phoneNumberIds.length > 0
        ? await prisma.$queryRaw<(AgentRawResult & { phoneNumberId: number; agentType: string })[]>`
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

    const agentsByPhoneNumber = agents.reduce((acc, agent) => {
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
    }, {} as Record<number, { inbound: AgentRawResult | null; outbound: AgentRawResult | null }>);

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

  static async updateSubscriptionStatus({
    id,
    subscriptionStatus,
    disconnectOutboundAgent = false,
  }: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectOutboundAgent?: boolean;
  }) {
    const updateData: Prisma.CalAiPhoneNumberUpdateInput = {
      subscriptionStatus,
    };

    if (disconnectOutboundAgent) {
      updateData.outboundAgent = {
        disconnect: true,
      };
    }

    return await prisma.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }

  static async updateAgents({
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
        const agent = await prisma.agent.findFirst({
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
        const agent = await prisma.agent.findFirst({
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

    return await prisma.calAiPhoneNumber.update({
      where: {
        id,
      },
      data: updateData,
    });
  }
}