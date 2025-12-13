import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import { PhoneNumberSubscriptionStatus } from "@calcom/prisma/enums";

import type {
  IPhoneNumberRepository,
  PhoneNumberDto,
  PhoneNumberWithAgentsDto,
  PhoneNumberWithUserAndTeamDto,
  CreatePhoneNumberInput,
  AgentInfo,
} from "./IPhoneNumberRepository";

interface PhoneNumberRawResult {
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

interface AgentRawResult {
  id: string;
  name: string;
  providerAgentId: string;
  phoneNumberId: number;
  agentType: string;
}

export class KyselyPhoneNumberRepository implements IPhoneNumberRepository {
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

  async findByPhoneNumberAndUserId(params: {
    phoneNumber: string;
    userId: number;
  }): Promise<PhoneNumberDto> {
    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select([
        "id",
        "phoneNumber",
        "userId",
        "teamId",
        "subscriptionStatus",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "provider",
        "inboundAgentId",
        "outboundAgentId",
        "createdAt",
        "updatedAt",
      ])
      .where("phoneNumber", "=", params.phoneNumber)
      .where("userId", "=", params.userId)
      .executeTakeFirst();

    if (!result) {
      throw new Error("Phone number not found");
    }

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findPhoneNumbersFromUserId(params: { userId: number }): Promise<PhoneNumberWithAgentsDto[]> {
    const phoneNumbers = await sql<PhoneNumberRawResult>`
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
      WHERE pn."userId" = ${params.userId}
        AND (pn."subscriptionStatus" = ${PhoneNumberSubscriptionStatus.ACTIVE} OR pn."subscriptionStatus" IS NULL)
    `.execute(this.dbRead);

    const phoneNumberIds = phoneNumbers.rows.map((pn) => pn.id);

    let agents: AgentRawResult[] = [];
    if (phoneNumberIds.length > 0) {
      const agentResults = await sql<AgentRawResult>`
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
        WHERE pn.id IN (${sql.join(phoneNumberIds)})
      `.execute(this.dbRead);
      agents = agentResults.rows;
    }

    const agentsByPhoneNumber = agents.reduce(
      (acc, agent) => {
        const phoneNumberId = agent.phoneNumberId;
        if (!acc[phoneNumberId]) {
          acc[phoneNumberId] = { inbound: null, outbound: null };
        }

        const agentData: AgentInfo = {
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
      {} as Record<number, { inbound: AgentInfo | null; outbound: AgentInfo | null }>
    );

    return phoneNumbers.rows.map((pn) => ({
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
      inboundAgentId: pn.inboundAgentId,
      outboundAgentId: pn.outboundAgentId,
      inboundAgent: agentsByPhoneNumber[pn.id]?.inbound || null,
      outboundAgent: agentsByPhoneNumber[pn.id]?.outbound || null,
    }));
  }

  async createPhoneNumber(input: CreatePhoneNumberInput): Promise<PhoneNumberDto> {
    const result = await this.dbWrite
      .insertInto("CalAiPhoneNumber")
      .values({
        phoneNumber: input.phoneNumber,
        provider: input.provider,
        userId: input.userId,
        teamId: input.teamId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
        subscriptionStatus: input.subscriptionStatus,
        providerPhoneNumberId: input.providerPhoneNumberId,
      })
      .returning([
        "id",
        "phoneNumber",
        "provider",
        "userId",
        "teamId",
        "subscriptionStatus",
        "createdAt",
        "updatedAt",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "inboundAgentId",
        "outboundAgentId",
        "providerPhoneNumberId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
      providerPhoneNumberId: result.providerPhoneNumberId,
    };
  }

  async deletePhoneNumber(params: { phoneNumber: string }): Promise<PhoneNumberDto> {
    const result = await this.dbWrite
      .deleteFrom("CalAiPhoneNumber")
      .where("phoneNumber", "=", params.phoneNumber)
      .returning([
        "id",
        "phoneNumber",
        "provider",
        "userId",
        "teamId",
        "subscriptionStatus",
        "createdAt",
        "updatedAt",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "inboundAgentId",
        "outboundAgentId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findByStripeSubscriptionId(params: {
    stripeSubscriptionId: string;
  }): Promise<PhoneNumberDto | null> {
    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select([
        "id",
        "phoneNumber",
        "provider",
        "userId",
        "teamId",
        "subscriptionStatus",
        "stripeCustomerId",
        "stripeSubscriptionId",
        "createdAt",
        "updatedAt",
        "inboundAgentId",
        "outboundAgentId",
      ])
      .where("stripeSubscriptionId", "=", params.stripeSubscriptionId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findByIdAndUserId(params: { id: number; userId: number }): Promise<PhoneNumberDto | null> {
    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select([
        "id",
        "phoneNumber",
        "userId",
        "teamId",
        "subscriptionStatus",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "provider",
        "inboundAgentId",
        "outboundAgentId",
        "createdAt",
        "updatedAt",
      ])
      .where("id", "=", params.id)
      .where("userId", "=", params.userId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findByIdWithTeamAccess(params: {
    id: number;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    if (!accessibleTeamIds.includes(params.teamId)) {
      return null;
    }

    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select([
        "id",
        "phoneNumber",
        "userId",
        "teamId",
        "subscriptionStatus",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "provider",
        "inboundAgentId",
        "outboundAgentId",
        "createdAt",
        "updatedAt",
      ])
      .where("id", "=", params.id)
      .where("teamId", "=", params.teamId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findByPhoneNumberAndTeamId(params: {
    phoneNumber: string;
    teamId: number;
    userId: number;
  }): Promise<PhoneNumberDto | null> {
    const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

    if (!accessibleTeamIds.includes(params.teamId)) {
      return null;
    }

    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select([
        "id",
        "phoneNumber",
        "userId",
        "teamId",
        "subscriptionStatus",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "provider",
        "inboundAgentId",
        "outboundAgentId",
        "createdAt",
        "updatedAt",
      ])
      .where("phoneNumber", "=", params.phoneNumber)
      .where("teamId", "=", params.teamId)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async findManyWithUserAccess(params: {
    userId: number;
    teamId?: number;
    scope?: "personal" | "team" | "all";
  }): Promise<PhoneNumberWithAgentsDto[]> {
    const scope = params.scope ?? "all";
    let whereCondition: ReturnType<typeof sql>;

    if (scope === "personal") {
      whereCondition = sql`pn."userId" = ${params.userId}`;
    } else if (scope === "team") {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

      if (accessibleTeamIds.length === 0) {
        return [];
      }

      if (params.teamId) {
        if (!accessibleTeamIds.includes(params.teamId)) {
          return [];
        }
        whereCondition = sql`pn."teamId" = ${params.teamId}`;
      } else {
        whereCondition = sql`pn."teamId" IN (${sql.join(accessibleTeamIds)})`;
      }
    } else {
      const accessibleTeamIds = await this.getUserAccessibleTeamIds(params.userId);

      if (params.teamId) {
        if (accessibleTeamIds.includes(params.teamId)) {
          whereCondition = sql`(pn."userId" = ${params.userId} OR pn."teamId" = ${params.teamId})`;
        } else {
          whereCondition = sql`pn."userId" = ${params.userId}`;
        }
      } else if (accessibleTeamIds.length > 0) {
        whereCondition = sql`(pn."userId" = ${params.userId} OR pn."teamId" IN (${sql.join(accessibleTeamIds)}))`;
      } else {
        whereCondition = sql`pn."userId" = ${params.userId}`;
      }
    }

    const phoneNumbers = await sql<PhoneNumberRawResult>`
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
    `.execute(this.dbRead);

    const phoneNumberIds = phoneNumbers.rows.map((pn) => pn.id);

    let agents: AgentRawResult[] = [];
    if (phoneNumberIds.length > 0) {
      const agentResults = await sql<AgentRawResult>`
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
        WHERE pn.id IN (${sql.join(phoneNumberIds)})
      `.execute(this.dbRead);
      agents = agentResults.rows;
    }

    const agentsByPhoneNumber = agents.reduce(
      (acc, agent) => {
        const phoneNumberId = agent.phoneNumberId;
        if (!acc[phoneNumberId]) {
          acc[phoneNumberId] = { inbound: null, outbound: null };
        }

        const agentData: AgentInfo = {
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
      {} as Record<number, { inbound: AgentInfo | null; outbound: AgentInfo | null }>
    );

    return phoneNumbers.rows.map((pn) => ({
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
      inboundAgentId: pn.inboundAgentId,
      outboundAgentId: pn.outboundAgentId,
      inboundAgent: agentsByPhoneNumber[pn.id]?.inbound || null,
      outboundAgent: agentsByPhoneNumber[pn.id]?.outbound || null,
    }));
  }

  async updateSubscriptionStatus(params: {
    id: number;
    subscriptionStatus: PhoneNumberSubscriptionStatus;
    disconnectAgents?: boolean;
  }): Promise<PhoneNumberDto> {
    const updateData: Record<string, unknown> = {
      subscriptionStatus: params.subscriptionStatus,
    };

    if (params.disconnectAgents) {
      updateData.inboundAgentId = null;
      updateData.outboundAgentId = null;
    }

    const result = await this.dbWrite
      .updateTable("CalAiPhoneNumber")
      .set(updateData)
      .where("id", "=", params.id)
      .returning([
        "id",
        "phoneNumber",
        "provider",
        "userId",
        "teamId",
        "subscriptionStatus",
        "createdAt",
        "updatedAt",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "inboundAgentId",
        "outboundAgentId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async updateAgents(params: {
    id: number;
    inboundProviderAgentId?: string | null;
    outboundProviderAgentId?: string | null;
  }): Promise<PhoneNumberDto> {
    const updateData: Record<string, unknown> = {};

    if (params.inboundProviderAgentId !== undefined) {
      if (params.inboundProviderAgentId) {
        const agent = await this.dbRead
          .selectFrom("Agent")
          .select("id")
          .where("providerAgentId", "=", params.inboundProviderAgentId)
          .executeTakeFirst();

        if (agent) {
          updateData.inboundAgentId = agent.id;
        } else {
          updateData.inboundAgentId = null;
        }
      } else {
        updateData.inboundAgentId = null;
      }
    }

    if (params.outboundProviderAgentId !== undefined) {
      if (params.outboundProviderAgentId) {
        const agent = await this.dbRead
          .selectFrom("Agent")
          .select("id")
          .where("providerAgentId", "=", params.outboundProviderAgentId)
          .executeTakeFirst();

        if (agent) {
          updateData.outboundAgentId = agent.id;
        } else {
          updateData.outboundAgentId = null;
        }
      } else {
        updateData.outboundAgentId = null;
      }
    }

    const result = await this.dbWrite
      .updateTable("CalAiPhoneNumber")
      .set(updateData)
      .where("id", "=", params.id)
      .returning([
        "id",
        "phoneNumber",
        "provider",
        "userId",
        "teamId",
        "subscriptionStatus",
        "createdAt",
        "updatedAt",
        "stripeSubscriptionId",
        "stripeCustomerId",
        "inboundAgentId",
        "outboundAgentId",
      ])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      provider: result.provider,
      userId: result.userId,
      teamId: result.teamId,
      subscriptionStatus: result.subscriptionStatus,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      stripeCustomerId: result.stripeCustomerId,
      stripeSubscriptionId: result.stripeSubscriptionId,
      inboundAgentId: result.inboundAgentId,
      outboundAgentId: result.outboundAgentId,
    };
  }

  async updateInboundAgentId(params: { id: number; agentId: string }): Promise<{ count: number }> {
    const result = await this.dbWrite
      .updateTable("CalAiPhoneNumber")
      .set({ inboundAgentId: params.agentId })
      .where("id", "=", params.id)
      .where("inboundAgentId", "is", null)
      .execute();

    return { count: Number(result[0]?.numUpdatedRows ?? 0) };
  }

  async findInboundAgentIdByPhoneNumberId(params: {
    phoneNumberId: number;
  }): Promise<{ inboundAgentId: string | null } | null> {
    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .select("inboundAgentId")
      .where("id", "=", params.phoneNumberId)
      .executeTakeFirst();

    if (!result) return null;

    return { inboundAgentId: result.inboundAgentId };
  }

  async findByPhoneNumber(params: {
    phoneNumber: string;
  }): Promise<PhoneNumberWithUserAndTeamDto | null> {
    const result = await this.dbRead
      .selectFrom("CalAiPhoneNumber")
      .leftJoin("users", "users.id", "CalAiPhoneNumber.userId")
      .leftJoin("Team", "Team.id", "CalAiPhoneNumber.teamId")
      .select([
        "CalAiPhoneNumber.id",
        "CalAiPhoneNumber.phoneNumber",
        "CalAiPhoneNumber.userId",
        "CalAiPhoneNumber.teamId",
        "users.id as user_id",
        "users.email as user_email",
        "users.name as user_name",
        "Team.id as team_id",
        "Team.name as team_name",
        "Team.parentId as team_parentId",
      ])
      .where("CalAiPhoneNumber.phoneNumber", "=", params.phoneNumber)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      phoneNumber: result.phoneNumber,
      userId: result.userId,
      teamId: result.teamId,
      user: result.user_id
        ? {
            id: result.user_id,
            email: result.user_email ?? "",
            name: result.user_name,
          }
        : null,
      team: result.team_id
        ? {
            id: result.team_id,
            name: result.team_name ?? "",
            parentId: result.team_parentId,
          }
        : null,
    };
  }
}
