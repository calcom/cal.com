import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import { MembershipRole } from "@calcom/prisma/enums";

import type {
  IAgentRepository,
  AgentDto,
  AgentWithTeamDto,
  AgentWithDetailsDto,
  AgentWithCallAccessDto,
  AgentWithPhoneNumbersDto,
  CreateAgentInput,
  PhoneNumberInfo,
} from "./IAgentRepository";

interface AgentRawResult {
  id: string;
  name: string;
  providerAgentId: string;
  enabled: boolean;
  userId: number;
  teamId: number | null;
  inboundEventTypeId: number | null;
  outboundEventTypeId: number | null;
  createdAt: Date;
  updatedAt: Date;
  user_id?: number;
  user_name?: string | null;
  user_email?: string | null;
  team_id?: number;
  team_name?: string | null;
  team_slug?: string | null;
  team_logo_url?: string | null;
  team_parentId?: number | null;
}

interface PhoneNumberRawResult {
  id: number;
  phoneNumber: string;
  subscriptionStatus: string | null;
  provider: string | null;
  outboundAgentId?: string;
}

export class KyselyAgentRepository implements IAgentRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  private async getUserAccessibleTeamIds(userId: number): Promise<number[]> {
    const memberships = await this.dbRead
      .selectFrom("Membership")
      .select("teamId")
      .where("userId", "=", userId)
      .where("accepted", "=", true)
      .execute();

    return memberships.map((m) => m.teamId);
  }

  private async getUserAdminTeamIds(userId: number): Promise<number[]> {
    const memberships = await this.dbRead
      .selectFrom("Membership")
      .select("teamId")
      .where("userId", "=", userId)
      .where("accepted", "=", true)
      .where("role", "in", [MembershipRole.ADMIN, MembershipRole.OWNER])
      .execute();

    return memberships.map((m) => m.teamId);
  }

  async findByIdWithUserAccess(params: {
    agentId: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    let whereCondition: ReturnType<typeof sql>;
    if (params.teamId) {
      if (accessibleTeamIds.includes(params.teamId)) {
        whereCondition = sql`id = ${params.agentId} AND "teamId" = ${params.teamId}`;
      } else {
        whereCondition = sql`id = ${params.agentId} AND "userId" = ${params.userId}`;
      }
    } else if (accessibleTeamIds.length > 0) {
      whereCondition = sql`id = ${params.agentId} AND ("userId" = ${params.userId} OR "teamId" IN (${sql.join(accessibleTeamIds)}))`;
    } else {
      whereCondition = sql`id = ${params.agentId} AND "userId" = ${params.userId}`;
    }

    const result = await sql<AgentRawResult>`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "inboundEventTypeId",
        "outboundEventTypeId",
        "createdAt",
        "updatedAt"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `.execute(this.dbRead);

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  async findByProviderAgentIdWithUserAccess(params: {
    providerAgentId: string;
    userId: number;
  }): Promise<AgentDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    let whereCondition: ReturnType<typeof sql>;
    if (accessibleTeamIds.length > 0) {
      whereCondition = sql`"providerAgentId" = ${params.providerAgentId} AND ("userId" = ${params.userId} OR "teamId" IN (${sql.join(accessibleTeamIds)}))`;
    } else {
      whereCondition = sql`"providerAgentId" = ${params.providerAgentId} AND "userId" = ${params.userId}`;
    }

    const result = await sql<AgentRawResult>`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "inboundEventTypeId",
        "outboundEventTypeId",
        "createdAt",
        "updatedAt"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `.execute(this.dbRead);

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  async findById(params: { id: string }): Promise<AgentDto | null> {
    const result = await this.dbRead
      .selectFrom("Agent")
      .select([
        "id",
        "name",
        "providerAgentId",
        "enabled",
        "userId",
        "teamId",
        "inboundEventTypeId",
        "outboundEventTypeId",
        "createdAt",
        "updatedAt",
      ])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findByProviderAgentId(params: { providerAgentId: string }): Promise<AgentWithTeamDto | null> {
    const result = await this.dbRead
      .selectFrom("Agent")
      .leftJoin("Team", "Team.id", "Agent.teamId")
      .select([
        "Agent.id",
        "Agent.name",
        "Agent.providerAgentId",
        "Agent.enabled",
        "Agent.userId",
        "Agent.teamId",
        "Agent.inboundEventTypeId",
        "Agent.outboundEventTypeId",
        "Agent.createdAt",
        "Agent.updatedAt",
        "Team.id as team_id",
        "Team.parentId as team_parentId",
      ])
      .where("Agent.providerAgentId", "=", params.providerAgentId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      team: result.team_id
        ? {
            id: result.team_id,
            parentId: result.team_parentId,
          }
        : null,
    };
  }

  async findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<AgentWithDetailsDto[]> {
    const scope = params.scope ?? "all";
    let whereCondition: ReturnType<typeof sql>;

    if (scope === "personal") {
      whereCondition = sql`a."userId" = ${params.userId}`;
    } else if (scope === "team") {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

      if (accessibleTeamIds.length === 0) {
        return [];
      }

      if (params.teamId) {
        if (!accessibleTeamIds.includes(params.teamId)) {
          return [];
        }
        whereCondition = sql`a."teamId" = ${params.teamId}`;
      } else {
        whereCondition = sql`a."teamId" IN (${sql.join(accessibleTeamIds)})`;
      }
    } else {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

      if (params.teamId) {
        if (accessibleTeamIds.includes(params.teamId)) {
          whereCondition = sql`(a."userId" = ${params.userId} OR a."teamId" = ${params.teamId})`;
        } else {
          whereCondition = sql`a."userId" = ${params.userId}`;
        }
      } else if (accessibleTeamIds.length > 0) {
        whereCondition = sql`(a."userId" = ${params.userId} OR a."teamId" IN (${sql.join(accessibleTeamIds)}))`;
      } else {
        whereCondition = sql`a."userId" = ${params.userId}`;
      }
    }

    const agents = await sql<AgentRawResult>`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."inboundEventTypeId",
        a."outboundEventTypeId",
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
    `.execute(this.dbRead);

    const agentIds = agents.rows.map((agent) => agent.id);
    let phoneNumbers: PhoneNumberRawResult[] = [];

    if (agentIds.length > 0) {
      const phoneNumberResults = await sql<PhoneNumberRawResult>`
        SELECT
          pn.id,
          pn."phoneNumber",
          pn."subscriptionStatus",
          pn.provider,
          pn."outboundAgentId"
        FROM "CalAiPhoneNumber" pn
        WHERE pn."outboundAgentId" IN (${sql.join(agentIds)})
      `.execute(this.dbRead);
      phoneNumbers = phoneNumberResults.rows;
    }

    const phoneNumbersByAgent = phoneNumbers.reduce(
      (acc, pn) => {
        const agentId = pn.outboundAgentId;
        if (agentId) {
          if (!acc[agentId]) {
            acc[agentId] = [];
          }
          acc[agentId].push({
            id: pn.id,
            phoneNumber: pn.phoneNumber,
            subscriptionStatus: pn.subscriptionStatus ?? "",
            provider: pn.provider ?? "",
          });
        }
        return acc;
      },
      {} as Record<string, PhoneNumberInfo[]>
    );

    return agents.rows.map((agent) => ({
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
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

  async findByIdWithUserAccessAndDetails(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentWithDetailsDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    let whereCondition: ReturnType<typeof sql>;
    if (params.teamId) {
      if (accessibleTeamIds.includes(params.teamId)) {
        whereCondition = sql`a.id = ${params.id} AND a."teamId" = ${params.teamId}`;
      } else {
        whereCondition = sql`a.id = ${params.id} AND a."userId" = ${params.userId}`;
      }
    } else if (accessibleTeamIds.length > 0) {
      whereCondition = sql`a.id = ${params.id} AND (a."userId" = ${params.userId} OR a."teamId" IN (${sql.join(accessibleTeamIds)}))`;
    } else {
      whereCondition = sql`a.id = ${params.id} AND a."userId" = ${params.userId}`;
    }

    const result = await sql<AgentRawResult>`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."inboundEventTypeId",
        a."outboundEventTypeId",
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
    `.execute(this.dbRead);

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];

    const phoneNumbers = await sql<PhoneNumberRawResult>`
      SELECT
        pn.id,
        pn."phoneNumber",
        pn."subscriptionStatus",
        pn.provider
      FROM "CalAiPhoneNumber" pn
      WHERE pn."outboundAgentId" = ${agent.id}
    `.execute(this.dbRead);

    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
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
      outboundPhoneNumbers: phoneNumbers.rows.map((pn) => ({
        id: pn.id,
        phoneNumber: pn.phoneNumber,
        subscriptionStatus: pn.subscriptionStatus ?? "",
        provider: pn.provider ?? "",
      })),
    };
  }

  async create(input: CreateAgentInput): Promise<AgentDto> {
    const result = await this.dbWrite
      .insertInto("Agent")
      .values({
        name: input.name,
        providerAgentId: input.providerAgentId,
        userId: input.userId,
        teamId: input.teamId,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async findByIdWithAdminAccess(params: {
    id: string;
    userId: number;
    teamId?: number;
  }): Promise<AgentDto | null> {
    const adminTeamIds = await this.getUserAdminTeamIds(params.userId);

    let whereCondition: ReturnType<typeof sql>;
    if (params.teamId) {
      if (adminTeamIds.includes(params.teamId)) {
        whereCondition = sql`id = ${params.id} AND "teamId" = ${params.teamId}`;
      } else {
        whereCondition = sql`id = ${params.id} AND "userId" = ${params.userId}`;
      }
    } else if (adminTeamIds.length > 0) {
      whereCondition = sql`id = ${params.id} AND ("userId" = ${params.userId} OR "teamId" IN (${sql.join(adminTeamIds)}))`;
    } else {
      whereCondition = sql`id = ${params.id} AND "userId" = ${params.userId}`;
    }

    const result = await sql<AgentRawResult>`
      SELECT
        id,
        name,
        "providerAgentId",
        enabled,
        "userId",
        "teamId",
        "createdAt",
        "updatedAt",
        "inboundEventTypeId",
        "outboundEventTypeId"
      FROM "Agent"
      WHERE ${whereCondition}
      LIMIT 1
    `.execute(this.dbRead);

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];
    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };
  }

  async findByIdWithCallAccess(params: {
    id: string;
    userId: number;
  }): Promise<AgentWithCallAccessDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    let whereCondition: ReturnType<typeof sql>;
    if (accessibleTeamIds.length > 0) {
      whereCondition = sql`a.id = ${params.id} AND (a."userId" = ${params.userId} OR a."teamId" IN (${sql.join(accessibleTeamIds)}))`;
    } else {
      whereCondition = sql`a.id = ${params.id} AND a."userId" = ${params.userId}`;
    }

    const result = await sql<AgentRawResult>`
      SELECT
        a.id,
        a.name,
        a."providerAgentId",
        a.enabled,
        a."userId",
        a."teamId",
        a."inboundEventTypeId",
        a."outboundEventTypeId",
        a."createdAt",
        a."updatedAt"
      FROM "Agent" a
      WHERE ${whereCondition}
      LIMIT 1
    `.execute(this.dbRead);

    if (result.rows.length === 0) return null;

    const agent = result.rows[0];

    const phoneNumbers = await sql<{ phoneNumber: string }>`
      SELECT "phoneNumber"
      FROM "CalAiPhoneNumber"
      WHERE "outboundAgentId" = ${agent.id}
    `.execute(this.dbRead);

    return {
      id: agent.id,
      name: agent.name,
      providerAgentId: agent.providerAgentId,
      enabled: agent.enabled,
      userId: agent.userId,
      teamId: agent.teamId,
      inboundEventTypeId: agent.inboundEventTypeId,
      outboundEventTypeId: agent.outboundEventTypeId,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      outboundPhoneNumbers: phoneNumbers.rows,
    };
  }

  async delete(params: { id: string }): Promise<AgentDto> {
    const result = await this.dbWrite
      .deleteFrom("Agent")
      .where("id", "=", params.id)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async linkOutboundAgentToWorkflow(params: {
    workflowStepId: number;
    agentId: string;
  }): Promise<{ id: number; agentId: string | null }> {
    const result = await this.dbWrite
      .updateTable("WorkflowStep")
      .set({ agentId: params.agentId })
      .where("id", "=", params.workflowStepId)
      .returning(["id", "agentId"])
      .executeTakeFirstOrThrow();

    return { id: result.id, agentId: result.agentId };
  }

  async linkInboundAgentToWorkflow(params: {
    workflowStepId: number;
    agentId: string;
  }): Promise<{ id: number; inboundAgentId: string | null }> {
    const result = await this.dbWrite
      .updateTable("WorkflowStep")
      .set({ inboundAgentId: params.agentId })
      .where("id", "=", params.workflowStepId)
      .returning(["id", "inboundAgentId"])
      .executeTakeFirstOrThrow();

    return { id: result.id, inboundAgentId: result.inboundAgentId };
  }

  async updateEventTypeId(params: { agentId: string; eventTypeId: number }): Promise<AgentDto> {
    const result = await this.dbWrite
      .updateTable("Agent")
      .set({ inboundEventTypeId: params.eventTypeId })
      .where("id", "=", params.agentId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async updateOutboundEventTypeId(params: { agentId: string; eventTypeId: number }): Promise<AgentDto> {
    const result = await this.dbWrite
      .updateTable("Agent")
      .set({ outboundEventTypeId: params.eventTypeId })
      .where("id", "=", params.agentId)
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      name: result.name,
      providerAgentId: result.providerAgentId,
      enabled: result.enabled,
      userId: result.userId,
      teamId: result.teamId,
      inboundEventTypeId: result.inboundEventTypeId,
      outboundEventTypeId: result.outboundEventTypeId,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  async canManageTeamResources(params: { userId: number; teamId: number }): Promise<boolean> {
    const result = await sql<{ count: string }>`
      SELECT COUNT(*) as count
      FROM "Membership"
      WHERE "userId" = ${params.userId}
        AND "teamId" = ${params.teamId}
        AND accepted = true
        AND role IN ('ADMIN', 'OWNER')
    `.execute(this.dbRead);

    return Number(result.rows[0].count) > 0;
  }

  async findAgentWithPhoneNumbers(agentId: string): Promise<AgentWithPhoneNumbersDto | null> {
    const agent = await this.dbRead
      .selectFrom("Agent")
      .select("id")
      .where("id", "=", agentId)
      .executeTakeFirst();

    if (!agent) return null;

    const phoneNumbers = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select(["id", "phoneNumber", "subscriptionStatus"])
      .where("outboundAgentId", "=", agentId)
      .execute();

    return {
      id: agent.id,
      outboundPhoneNumbers: phoneNumbers.map((pn) => ({
        id: pn.id,
        phoneNumber: pn.phoneNumber,
        subscriptionStatus: pn.subscriptionStatus,
      })),
    };
  }

  async findProviderAgentIdById(agentId: string): Promise<{ providerAgentId: string } | null> {
    const result = await this.dbRead
      .selectFrom("Agent")
      .select("providerAgentId")
      .where("id", "=", agentId)
      .executeTakeFirst();

    if (!result) return null;

    return { providerAgentId: result.providerAgentId };
  }
}
