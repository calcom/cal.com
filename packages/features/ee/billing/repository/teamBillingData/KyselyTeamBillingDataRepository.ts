import type { Kysely } from "kysely";
import { sql } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { ITeamBillingDataRepository, TeamBillingType } from "./ITeamBillingDataRepository";

export class KyselyTeamBillingDataRepository implements ITeamBillingDataRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async find(teamId: number): Promise<TeamBillingType> {
    const result = await this.dbRead
      .selectFrom("Team")
      .select(["id", "metadata", "isOrganization", "parentId", "name"])
      .where("id", "=", teamId)
      .executeTakeFirst();

    if (!result) {
      throw new Error(`Team with id ${teamId} not found`);
    }

    return {
      id: result.id,
      metadata: result.metadata,
      isOrganization: result.isOrganization,
      parentId: result.parentId,
      name: result.name,
    };
  }

  async findBySubscriptionId(subscriptionId: string): Promise<TeamBillingType | null> {
    // Query using JSON path for metadata->subscriptionId
    const result = await this.dbRead
      .selectFrom("Team")
      .select(["id", "metadata", "isOrganization", "parentId", "name"])
      .where(sql`metadata->>'subscriptionId'`, "=", subscriptionId)
      .executeTakeFirst();

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      metadata: result.metadata,
      isOrganization: result.isOrganization,
      parentId: result.parentId,
      name: result.name,
    };
  }

  async findMany(teamIds: number[]): Promise<TeamBillingType[]> {
    if (teamIds.length === 0) {
      return [];
    }

    const results = await this.dbRead
      .selectFrom("Team")
      .select(["id", "metadata", "isOrganization", "parentId", "name"])
      .where("id", "in", teamIds)
      .execute();

    return results.map((result) => ({
      id: result.id,
      metadata: result.metadata,
      isOrganization: result.isOrganization,
      parentId: result.parentId,
      name: result.name,
    }));
  }
}
