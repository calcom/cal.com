import prisma from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

interface _AgentRawResult {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number;
  teamId: number | null;
  createdAt: Date;
  updatedAt: Date;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  team_id?: number;
  team_name?: string;
  team_slug?: string;
  team_logo_url?: string;
}

interface _PhoneNumberRawResult {
  id: number;
  phoneNumber: string;
  subscriptionStatus: string;
  provider: string;
  outboundAgentId?: string;
}

export class PrismaAgentRepository {
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

  private static async getUserAdminTeamIds(userId: number): Promise<number[]> {
    const memberships = await prisma.membership.findMany({
      where: {
        userId,
        accepted: true,
        role: {
          in: [MembershipRole.ADMIN, MembershipRole.OWNER],
        },
      },
      select: {
        teamId: true,
      },
    });

    return memberships.map((membership) => membership.teamId);
  }

  static async findByIdWithUserAccess({
    agentId,
    userId,
    teamId,
  }: {
    agentId: string;
    userId: number;
    teamId?: number;
  }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    let whereCondition: Prisma.Sql;
    if (teamId) {
      // If teamId is provided, check that the user has access to that specific team
      if (accessibleTeamIds.includes(teamId)) {
        whereCondition = Prisma.sql`id = ${agentId} AND "teamId" = ${teamId}`;
      } else {
        // If user doesn't have access to the team, only check for personal agents
        whereCondition = Prisma.sql`id = ${agentId} AND "userId" = ${userId}`;
      }
    } else if (accessibleTeamIds.length > 0) {
      // No specific teamId provided, check both personal and team agents
      whereCondition = Prisma.sql`id = ${agentId} AND ("userId" = ${userId} OR "teamId" IN (${Prisma.join(
        accessibleTeamIds
      )}))`;
    } else {
      // User has no team access, only check personal agents
      whereCondition = Prisma.sql`id = ${agentId} AND "userId" = ${userId}`;
    }

    const query = Prisma.sql`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "createdAt",
        "updatedAt"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    return agents.length > 0 ? agents[0] : null;
  }

  static async findByProviderAgentIdWithUserAccess({
    providerAgentId,
    userId,
  }: {
    providerAgentId: string;
    userId: number;
  }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    let whereCondition: Prisma.Sql;
    if (accessibleTeamIds.length > 0) {
      whereCondition = Prisma.sql`"providerAgentId" = ${providerAgentId} AND ("userId" = ${userId} OR "teamId" IN (${Prisma.join(
        accessibleTeamIds
      )}))`;
    } else {
      whereCondition = Prisma.sql`"providerAgentId" = ${providerAgentId} AND "userId" = ${userId}`;
    }

    const query = Prisma.sql`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "createdAt",
        "updatedAt"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    return agents.length > 0 ? agents[0] : null;
  }

  static async findById({ id }: { id: string }) {
    return await prisma.agent.findUnique({
      select: {
        id: true,
        name: true,
        providerAgentId: true,
        enabled: true,
        userId: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        id,
      },
    });
  }

  static async findByProviderAgentId({ providerAgentId }: { providerAgentId: string }) {
    return await prisma.agent.findUnique({
      select: {
        id: true,
        name: true,
        providerAgentId: true,
        enabled: true,
        userId: true,
        teamId: true,
        createdAt: true,
        updatedAt: true,
      },
      where: {
        providerAgentId,
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
      whereCondition = Prisma.sql`a."userId" = ${userId}`;
    } else if (scope === "team") {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

      if (accessibleTeamIds.length === 0) {
        return [];
      }

      if (teamId) {
        // Check if user has access to the specific team
        if (!accessibleTeamIds.includes(teamId)) {
          return [];
        }
        whereCondition = Prisma.sql`a."teamId" = ${teamId}`;
      } else {
        whereCondition = Prisma.sql`a."teamId" IN (${Prisma.join(accessibleTeamIds)})`;
      }
    } else {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

      if (teamId) {
        if (accessibleTeamIds.includes(teamId)) {
          whereCondition = Prisma.sql`(a."userId" = ${userId} OR a."teamId" = ${teamId})`;
        } else {
          whereCondition = Prisma.sql`a."userId" = ${userId}`;
        }
      } else if (accessibleTeamIds.length > 0) {
        whereCondition = Prisma.sql`(a."userId" = ${userId} OR a."teamId" IN (${Prisma.join(
          accessibleTeamIds
        )}))`;
      } else {
        whereCondition = Prisma.sql`a."userId" = ${userId}`;
      }
    }

    const query = Prisma.sql`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."createdAt",
        a."updatedAt",
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        t.id as team_id,
        t.name as team_name,
        t.slug as team_slug,
        t."logoUrl" as team_logo_url
      FROM "Agent" a
      LEFT JOIN "users" u ON a."userId" = u.id
      LEFT JOIN "Team" t ON a."teamId" = t.id
      WHERE ${whereCondition}
      ORDER BY a."teamId" ASC, a."createdAt" DESC
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    // Get phone numbers for each agent in a separate query to avoid N+1
    const agentIds = agents.map((agent) => agent.id);
    const phoneNumbers =
      agentIds.length > 0
        ? await prisma.$queryRaw<_PhoneNumberRawResult[]>`
      SELECT
        pn.id,
        pn."phoneNumber",
        pn."subscriptionStatus",
        pn.provider,
        pn."outboundAgentId"
      FROM "CalAiPhoneNumber" pn
      WHERE pn."outboundAgentId" IN (${Prisma.join(agentIds)})
    `
        : [];

    // Map phone numbers to agents
    const phoneNumbersByAgent = phoneNumbers.reduce((acc, pn) => {
      const agentId = pn.outboundAgentId;
      if (agentId) {
        if (!acc[agentId]) {
          acc[agentId] = [];
        }
        acc[agentId].push({
          id: pn.id,
          phoneNumber: pn.phoneNumber,
          subscriptionStatus: pn.subscriptionStatus,
          provider: pn.provider,
        });
      }
      return acc;
    }, {} as Record<string, _PhoneNumberRawResult[]>);

    // Transform results to match expected format
    return agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user_id
        ? {
            id: agent.user_id,
            name: agent.user_name ?? null,
            email: agent.user_email ?? null,
          }
        : null,
      team: agent.team_id
        ? {
            id: agent.team_id,
            name: agent.team_name ?? null,
            slug: agent.team_slug ?? null,
            logoUrl: agent.team_logo_url ?? null,
          }
        : null,
      outboundPhoneNumbers: phoneNumbersByAgent[agent.id] || [],
    }));
  }

  static async findByIdWithUserAccessAndDetails({
    id,
    userId,
    teamId,
  }: {
    id: string;
    userId: number;
    teamId?: number;
  }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    let whereCondition: Prisma.Sql;
    if (teamId) {
      // If teamId is provided, check that the user has access to that specific team
      if (accessibleTeamIds.includes(teamId)) {
        whereCondition = Prisma.sql`a.id = ${id} AND a."teamId" = ${teamId}`;
      } else {
        // If user doesn't have access to the team, only check for personal agents
        whereCondition = Prisma.sql`a.id = ${id} AND a."userId" = ${userId}`;
      }
    } else if (accessibleTeamIds.length > 0) {
      // No specific teamId provided, check both personal and team agents
      whereCondition = Prisma.sql`a.id = ${id} AND (a."userId" = ${userId} OR a."teamId" IN (${Prisma.join(
        accessibleTeamIds
      )}))`;
    } else {
      // User has no team access, only check personal agents
      whereCondition = Prisma.sql`a.id = ${id} AND a."userId" = ${userId}`;
    }

    const query = Prisma.sql`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."createdAt",
        a."updatedAt",
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        t.id as team_id,
        t.name as team_name,
        t.slug as team_slug
      FROM "Agent" a
      LEFT JOIN "users" u ON a."userId" = u.id
      LEFT JOIN "Team" t ON a."teamId" = t.id
      WHERE ${whereCondition}
      LIMIT 1
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    if (agents.length === 0) {
      return null;
    }

    const agent = agents[0];

    const phoneNumbers = await prisma.$queryRaw<_PhoneNumberRawResult[]>`
      SELECT
        pn.id,
        pn."phoneNumber",
        pn."subscriptionStatus",
        pn.provider
      FROM "CalAiPhoneNumber" pn
      WHERE pn."outboundAgentId" = ${agent.id}
    `;

    // Transform result to match expected format
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      user: agent.user_id
        ? {
            id: agent.user_id,
            name: agent.user_name ?? null,
            email: agent.user_email ?? null,
          }
        : null,
      team: agent.team_id
        ? {
            id: agent.team_id,
            name: agent.team_name ?? null,
            slug: agent.team_slug ?? null,
          }
        : null,
      outboundPhoneNumbers: phoneNumbers.map((pn) => ({
        id: pn.id,
        phoneNumber: pn.phoneNumber,
        subscriptionStatus: pn.subscriptionStatus,
        provider: pn.provider,
      })),
    };
  }

  static async create({
    name,
    providerAgentId,
    userId,
    teamId,
  }: {
    name: string;
    providerAgentId: string;
    userId: number;
    teamId?: number;
  }) {
    return await prisma.agent.create({
      data: {
        name,
        providerAgentId,
        userId,
        teamId,
      },
    });
  }

  static async findByIdWithAdminAccess({
    id,
    userId,
    teamId,
  }: {
    id: string;
    userId: number;
    teamId?: number;
  }) {
    const adminTeamIds = await this.getUserAdminTeamIds(userId);

    let whereCondition: Prisma.Sql;
    if (teamId) {
      // If teamId is specified, check that user has admin access to that specific team
      if (adminTeamIds.includes(teamId)) {
        whereCondition = Prisma.sql`id = ${id} AND "teamId" = ${teamId}`;
      } else {
        // If user doesn't have admin access to the team, only check for personal agents
        whereCondition = Prisma.sql`id = ${id} AND "userId" = ${userId}`;
      }
    } else if (adminTeamIds.length > 0) {
      whereCondition = Prisma.sql`id = ${id} AND ("userId" = ${userId} OR "teamId" IN (${Prisma.join(
        adminTeamIds
      )}))`;
    } else {
      whereCondition = Prisma.sql`id = ${id} AND "userId" = ${userId}`;
    }

    const query = Prisma.sql`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "createdAt",
        "updatedAt"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    return agents.length > 0 ? agents[0] : null;
  }

  static async findByIdWithCallAccess({ id, userId }: { id: string; userId: number }) {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(userId);

    let whereCondition: Prisma.Sql;
    if (accessibleTeamIds.length > 0) {
      whereCondition = Prisma.sql`a.id = ${id} AND (a."userId" = ${userId} OR a."teamId" IN (${Prisma.join(
        accessibleTeamIds
      )}))`;
    } else {
      whereCondition = Prisma.sql`a.id = ${id} AND a."userId" = ${userId}`;
    }

    const query = Prisma.sql`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."createdAt",
        a."updatedAt"
      FROM "Agent" a
      WHERE ${whereCondition}
      LIMIT 1
    `;

    const agents = await prisma.$queryRaw<_AgentRawResult[]>(query);

    if (agents.length === 0) {
      return null;
    }

    const agent = agents[0];

    const phoneNumbers = await prisma.$queryRaw<{ phoneNumber: string }[]>`
      SELECT "phoneNumber"
      FROM "CalAiPhoneNumber"
      WHERE "outboundAgentId" = ${agent.id}
    `;

    return {
      ...agent,
      outboundPhoneNumbers: phoneNumbers,
    };
  }

  static async delete({ id }: { id: string }) {
    return await prisma.agent.delete({
      where: { id },
    });
  }

  static async linkToWorkflowStep({ workflowStepId, agentId }: { workflowStepId: number; agentId: string }) {
    return await prisma.workflowStep.update({
      where: { id: workflowStepId },
      data: { agentId },
    });
  }

  static async canManageTeamResources({
    userId,
    teamId,
  }: {
    userId: number;
    teamId: number;
  }): Promise<boolean> {
    const result = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Membership"
      WHERE "userId" = ${userId}
        AND "teamId" = ${teamId}
        AND accepted = true
        AND role IN ('ADMIN', 'OWNER')
    `;

    return Number(result[0].count) > 0;
  }
}
