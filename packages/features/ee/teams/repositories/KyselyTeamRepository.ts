import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";

import type {
  ITeamRepository,
  TeamDto,
  TeamSlugDto,
  TeamWithHideBrandingDto,
  TeamWithMembersDto,
} from "./ITeamRepository";

/**
 * Kysely implementation of TeamRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyTeamRepository implements ITeamRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  private mapToTeamDto(row: Record<string, unknown>): TeamDto {
    return {
      id: row.id as number,
      name: row.name as string,
      slug: row.slug as string | null,
      logoUrl: row.logoUrl as string | null,
      parentId: row.parentId as number | null,
      metadata: row.metadata,
      isOrganization: row.isOrganization as boolean,
      isPlatform: row.isPlatform as boolean,
    };
  }

  async findById(params: { id: number }): Promise<TeamDto | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .select([
        "id",
        "name",
        "slug",
        "logoUrl",
        "parentId",
        "metadata",
        "isOrganization",
        "isPlatform",
        "organizationSettings",
      ])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!team) return null;
    return this.mapToTeamDto(team as unknown as Record<string, unknown>);
  }

  async findByIdIncludePlatformBilling(params: { id: number }): Promise<TeamDto | null> {
    // For now, just return the basic team data
    // Platform billing would need a separate join
    return this.findById(params);
  }

  async findAllByParentId(params: { parentId: number }): Promise<TeamDto[]> {
    const teams = await this.readDb
      .selectFrom("Team")
      .select([
        "id",
        "name",
        "slug",
        "logoUrl",
        "parentId",
        "metadata",
        "isOrganization",
        "isPlatform",
        "organizationSettings",
      ])
      .where("parentId", "=", params.parentId)
      .execute();

    return teams.map((team) => this.mapToTeamDto(team as unknown as Record<string, unknown>));
  }

  async findByIdAndParentId(params: { id: number; parentId: number }): Promise<TeamDto | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .select([
        "id",
        "name",
        "slug",
        "logoUrl",
        "parentId",
        "metadata",
        "isOrganization",
        "isPlatform",
        "organizationSettings",
      ])
      .where("id", "=", params.id)
      .where("parentId", "=", params.parentId)
      .executeTakeFirst();

    if (!team) return null;
    return this.mapToTeamDto(team as unknown as Record<string, unknown>);
  }

  async findTeamWithMembers(teamId: number): Promise<TeamWithMembersDto | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .select(["id", "name", "slug", "logoUrl", "parentId", "metadata", "isOrganization", "isPlatform"])
      .where("id", "=", teamId)
      .executeTakeFirst();

    if (!team) return null;

    const members = await this.readDb
      .selectFrom("Membership")
      .select(["accepted"])
      .where("teamId", "=", teamId)
      .execute();

    return {
      ...this.mapToTeamDto(team as unknown as Record<string, unknown>),
      members: members.map((m) => ({ accepted: m.accepted })),
    };
  }

  async findTeamSlugById(params: { id: number }): Promise<TeamSlugDto | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .select(["slug"])
      .where("id", "=", params.id)
      .executeTakeFirst();

    if (!team) return null;
    return { slug: team.slug };
  }

  async findTeamWithParentHideBranding(params: { teamId: number }): Promise<TeamWithHideBrandingDto | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .leftJoin("Team as Parent", "Parent.id", "Team.parentId")
      .select(["Team.hideBranding", "Parent.hideBranding as parent_hideBranding"])
      .where("Team.id", "=", params.teamId)
      .executeTakeFirst();

    if (!team) return null;

    return {
      hideBranding: team.hideBranding,
      parent:
        team.parent_hideBranding !== null && team.parent_hideBranding !== undefined
          ? { hideBranding: team.parent_hideBranding }
          : null,
    };
  }

  async findParentOrganizationByTeamId(teamId: number): Promise<{ id: number } | null> {
    const team = await this.readDb
      .selectFrom("Team")
      .leftJoin("Team as Parent", "Parent.id", "Team.parentId")
      .select(["Parent.id as parent_id"])
      .where("Team.id", "=", teamId)
      .executeTakeFirst();

    if (!team || team.parent_id === null) return null;
    return { id: team.parent_id };
  }

  async deleteById(params: { id: number }): Promise<TeamDto> {
    // Get team data before deletion
    const team = await this.findById(params);
    if (!team) {
      throw new Error(`Team with id ${params.id} not found`);
    }

    // Delete managed event types
    await this.writeDb
      .deleteFrom("EventType")
      .where("teamId", "=", params.id)
      .where("schedulingType", "=", "MANAGED")
      .execute();

    // Delete all memberships
    await this.writeDb.deleteFrom("Membership").where("teamId", "=", params.id).execute();

    // Delete the team
    await this.writeDb.deleteFrom("Team").where("id", "=", params.id).execute();

    return team;
  }

  async isSlugAvailableForUpdate(params: {
    slug: string;
    teamId: number;
    parentId?: number | null;
  }): Promise<boolean> {
    let query = this.readDb
      .selectFrom("Team")
      .select(["id"])
      .where("slug", "=", params.slug)
      .where("id", "!=", params.teamId);

    if (params.parentId !== undefined) {
      if (params.parentId === null) {
        query = query.where("parentId", "is", null);
      } else {
        query = query.where("parentId", "=", params.parentId);
      }
    }

    const conflictingTeam = await query.executeTakeFirst();
    return !conflictingTeam;
  }

  async findTeamsForCreditCheck(params: { teamIds: number[] }): Promise<
    {
      id: number;
      isOrganization: boolean;
      parentId: number | null;
      parent: { id: number } | null;
    }[]
  > {
    if (params.teamIds.length === 0) return [];

    const teams = await this.readDb
      .selectFrom("Team")
      .leftJoin("Team as Parent", "Parent.id", "Team.parentId")
      .select(["Team.id", "Team.isOrganization", "Team.parentId", "Parent.id as parent_id"])
      .where("Team.id", "in", params.teamIds)
      .execute();

    return teams.map((team) => ({
      id: team.id,
      isOrganization: team.isOrganization,
      parentId: team.parentId,
      parent: team.parent_id !== null ? { id: team.parent_id } : null,
    }));
  }
}
