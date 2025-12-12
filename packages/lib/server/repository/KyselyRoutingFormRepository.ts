import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type {
  RoutingFormDto,
  RoutingFormBasicDto,
  RoutingFormWithUserTeamAndOrgDto,
  IRoutingFormRepository,
} from "./IRoutingFormRepository";

export class KyselyRoutingFormRepository implements IRoutingFormRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findById(id: string): Promise<RoutingFormDto | null> {
    const result = await this.dbRead
      .selectFrom("App_RoutingForms_Form")
      .select([
        "id",
        "description",
        "position",
        "routes",
        "createdAt",
        "updatedAt",
        "name",
        "fields",
        "updatedById",
        "userId",
        "teamId",
        "disabled",
        "settings",
      ])
      .where("id", "=", id)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      description: result.description,
      position: result.position,
      routes: result.routes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      name: result.name,
      fields: result.fields,
      updatedById: result.updatedById,
      userId: result.userId,
      teamId: result.teamId,
      disabled: result.disabled,
      settings: result.settings,
    };
  }

  async findActiveFormsForUserOrTeam(params: {
    userId?: number;
    teamId?: number;
  }): Promise<RoutingFormBasicDto[]> {
    const { userId, teamId } = params;

    if (!userId && !teamId) return [];

    if (teamId) {
      // Team forms - check if user is a member
      const results = await this.dbRead
        .selectFrom("App_RoutingForms_Form")
        .innerJoin("Team", "Team.id", "App_RoutingForms_Form.teamId")
        .innerJoin("Membership", "Membership.teamId", "Team.id")
        .select(["App_RoutingForms_Form.id", "App_RoutingForms_Form.name"])
        .where("App_RoutingForms_Form.teamId", "=", teamId)
        .where("App_RoutingForms_Form.disabled", "=", false)
        .where("Membership.userId", "=", userId ?? 0)
        .where("Membership.accepted", "=", true)
        .orderBy("App_RoutingForms_Form.name", "asc")
        .execute();

      return results.map((row) => ({
        id: row.id,
        name: row.name,
      }));
    }

    // Personal forms only (not team forms)
    const results = await this.dbRead
      .selectFrom("App_RoutingForms_Form")
      .select(["id", "name"])
      .where("userId", "=", userId ?? 0)
      .where("teamId", "is", null)
      .where("disabled", "=", false)
      .orderBy("name", "asc")
      .execute();

    return results.map((row) => ({
      id: row.id,
      name: row.name,
    }));
  }

  async findFormByIdIncludeUserTeamAndOrg(
    formId: string
  ): Promise<RoutingFormWithUserTeamAndOrgDto | null> {
    // First get the form with basic user and team info
    const result = await this.dbRead
      .selectFrom("App_RoutingForms_Form")
      .leftJoin("users", "users.id", "App_RoutingForms_Form.userId")
      .leftJoin("Team", "Team.id", "App_RoutingForms_Form.teamId")
      .select([
        "App_RoutingForms_Form.id",
        "App_RoutingForms_Form.description",
        "App_RoutingForms_Form.position",
        "App_RoutingForms_Form.routes",
        "App_RoutingForms_Form.createdAt",
        "App_RoutingForms_Form.updatedAt",
        "App_RoutingForms_Form.name",
        "App_RoutingForms_Form.fields",
        "App_RoutingForms_Form.updatedById",
        "App_RoutingForms_Form.userId",
        "App_RoutingForms_Form.teamId",
        "App_RoutingForms_Form.disabled",
        "App_RoutingForms_Form.settings",
        "users.id as user_id",
        "users.username as user_username",
        "users.email as user_email",
        "users.movedToProfileId as user_movedToProfileId",
        "users.metadata as user_metadata",
        "users.timeFormat as user_timeFormat",
        "users.locale as user_locale",
        "users.organizationId as user_organizationId",
        "Team.parentId as team_parentId",
        "Team.slug as team_slug",
        "Team.metadata as team_metadata",
      ])
      .where("App_RoutingForms_Form.id", "=", formId)
      .executeTakeFirst();

    if (!result) return null;

    // Get organization slug if user has one
    let orgSlug: string | null = null;
    if (result.user_organizationId) {
      const org = await this.dbRead
        .selectFrom("Team")
        .select("slug")
        .where("id", "=", result.user_organizationId)
        .executeTakeFirst();
      orgSlug = org?.slug ?? null;
    }

    // Get parent team slug if team has a parent
    let parentSlug: string | null = null;
    if (result.team_parentId) {
      const parent = await this.dbRead
        .selectFrom("Team")
        .select("slug")
        .where("id", "=", result.team_parentId)
        .executeTakeFirst();
      parentSlug = parent?.slug ?? null;
    }

    return {
      id: result.id,
      description: result.description,
      position: result.position,
      routes: result.routes,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      name: result.name,
      fields: result.fields,
      updatedById: result.updatedById,
      userId: result.userId,
      teamId: result.teamId,
      disabled: result.disabled,
      settings: result.settings,
      user: result.user_id
        ? {
            id: result.user_id,
            username: result.user_username,
            email: result.user_email ?? "",
            movedToProfileId: result.user_movedToProfileId,
            metadata: result.user_metadata,
            timeFormat: result.user_timeFormat,
            locale: result.user_locale,
            organization: result.user_organizationId
              ? {
                  slug: orgSlug,
                }
              : null,
          }
        : null,
      team: result.teamId
        ? {
            parentId: result.team_parentId,
            parent: result.team_parentId
              ? {
                  slug: parentSlug,
                }
              : null,
            slug: result.team_slug,
            metadata: result.team_metadata,
          }
        : null,
    };
  }
}
