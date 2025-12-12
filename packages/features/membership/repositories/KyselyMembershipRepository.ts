import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely";
import type { MembershipRole } from "@calcom/prisma/enums";

import type {
  IMembershipRepository,
  MembershipCreateInputDto,
  MembershipDto,
  MembershipWithUserDto,
} from "./IMembershipRepository";

/**
 * Kysely implementation of MembershipRepository
 * Uses read/write database instances for read replica support
 */
export class KyselyMembershipRepository implements IMembershipRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async hasMembership(params: { userId: number; teamId: number }): Promise<boolean> {
    const membership = await this.readDb
      .selectFrom("Membership")
      .select(["id"])
      .where("userId", "=", params.userId)
      .where("teamId", "=", params.teamId)
      .where("accepted", "=", true)
      .executeTakeFirst();

    return !!membership;
  }

  async listAcceptedTeamMemberIds(params: { teamId: number }): Promise<number[]> {
    const memberships = await this.readDb
      .selectFrom("Membership")
      .select(["userId"])
      .where("teamId", "=", params.teamId)
      .where("accepted", "=", true)
      .execute();

    return memberships.map((m) => m.userId);
  }

  async create(data: MembershipCreateInputDto): Promise<MembershipDto> {
    const result = await this.writeDb
      .insertInto("Membership")
      .values({
        teamId: data.teamId,
        userId: data.userId,
        accepted: data.accepted,
        role: data.role,
        createdAt: data.createdAt || new Date(),
        disableImpersonation: false,
      })
      .returning(["id", "teamId", "userId", "accepted", "role", "disableImpersonation"])
      .executeTakeFirstOrThrow();

    return {
      id: result.id,
      teamId: result.teamId,
      userId: result.userId,
      accepted: result.accepted,
      role: result.role as MembershipRole,
      disableImpersonation: result.disableImpersonation,
    };
  }

  async createMany(data: MembershipCreateInputDto[]): Promise<{ count: number }> {
    if (data.length === 0) return { count: 0 };

    const values = data.map((item) => ({
      teamId: item.teamId,
      userId: item.userId,
      accepted: item.accepted,
      role: item.role,
      createdAt: item.createdAt || new Date(),
      disableImpersonation: false,
    }));

    const result = await this.writeDb.insertInto("Membership").values(values).execute();

    return { count: result.length };
  }

  async findUniqueByUserIdAndTeamId(params: {
    userId: number;
    teamId: number;
  }): Promise<MembershipDto | null> {
    const membership = await this.readDb
      .selectFrom("Membership")
      .select(["id", "teamId", "userId", "accepted", "role", "disableImpersonation"])
      .where("userId", "=", params.userId)
      .where("teamId", "=", params.teamId)
      .executeTakeFirst();

    if (!membership) return null;

    return {
      id: membership.id,
      teamId: membership.teamId,
      userId: membership.userId,
      accepted: membership.accepted,
      role: membership.role as MembershipRole,
      disableImpersonation: membership.disableImpersonation,
    };
  }

  async findAllByUserId(params: {
    userId: number;
    filters?: {
      accepted?: boolean;
      roles?: MembershipRole[];
    };
  }): Promise<
    {
      teamId: number;
      role: MembershipRole;
      team: {
        id: number;
        parentId: number | null;
      };
    }[]
  > {
    let query = this.readDb
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select(["Membership.teamId", "Membership.role", "Team.id as team_id", "Team.parentId as team_parentId"])
      .where("Membership.userId", "=", params.userId);

    if (params.filters?.accepted !== undefined) {
      query = query.where("Membership.accepted", "=", params.filters.accepted);
    }

    if (params.filters?.roles && params.filters.roles.length > 0) {
      query = query.where("Membership.role", "in", params.filters.roles);
    }

    const memberships = await query.execute();

    return memberships.map((m) => ({
      teamId: m.teamId,
      role: m.role as MembershipRole,
      team: {
        id: m.team_id,
        parentId: m.team_parentId,
      },
    }));
  }

  async findUserTeamIds(params: { userId: number }): Promise<number[]> {
    const memberships = await this.readDb
      .selectFrom("Membership")
      .select(["teamId"])
      .where("userId", "=", params.userId)
      .where("accepted", "=", true)
      .execute();

    return memberships.map((m) => m.teamId);
  }

  async findTeamAdminsByTeamId(params: { teamId: number }): Promise<
    {
      user: {
        email: string;
        locale: string | null;
      };
    }[]
  > {
    const memberships = await this.readDb
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .innerJoin("User", "User.id", "Membership.userId")
      .select(["User.email", "User.locale"])
      .where("Team.id", "=", params.teamId)
      .where("Team.parentId", "is not", null)
      .where("Membership.role", "in", ["ADMIN", "OWNER"])
      .execute();

    return memberships.map((m) => ({
      user: {
        email: m.email,
        locale: m.locale,
      },
    }));
  }

  async findAllByTeamIds(params: { teamIds: number[] }): Promise<{ userId: number }[]> {
    if (params.teamIds.length === 0) return [];

    const memberships = await this.readDb
      .selectFrom("Membership")
      .select(["userId"])
      .where("teamId", "in", params.teamIds)
      .where("accepted", "=", true)
      .execute();

    return memberships.map((m) => ({ userId: m.userId }));
  }

  async getAdminOrOwnerMembership(userId: number, teamId: number): Promise<{ id: number } | null> {
    const membership = await this.readDb
      .selectFrom("Membership")
      .select(["id"])
      .where("userId", "=", userId)
      .where("teamId", "=", teamId)
      .where("accepted", "=", true)
      .where("role", "in", ["ADMIN", "OWNER"])
      .executeTakeFirst();

    if (!membership) return null;
    return { id: membership.id };
  }

  async findFirstAcceptedMembershipByUserId(userId: number): Promise<MembershipDto | null> {
    const membership = await this.readDb
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.accepted",
        "Membership.role",
        "Membership.disableImpersonation",
      ])
      .where("Membership.accepted", "=", true)
      .where("Membership.userId", "=", userId)
      .where("Team.slug", "is not", null)
      .executeTakeFirst();

    if (!membership) return null;

    return {
      id: membership.id,
      teamId: membership.teamId,
      userId: membership.userId,
      accepted: membership.accepted,
      role: membership.role as MembershipRole,
      disableImpersonation: membership.disableImpersonation,
    };
  }

  async findAcceptedMembershipsByUserIdsInTeam(params: {
    userIds: number[];
    teamId: number;
  }): Promise<MembershipDto[]> {
    if (params.userIds.length === 0) return [];

    const memberships = await this.readDb
      .selectFrom("Membership")
      .select(["id", "teamId", "userId", "accepted", "role", "disableImpersonation"])
      .where("userId", "in", params.userIds)
      .where("accepted", "=", true)
      .where("teamId", "=", params.teamId)
      .execute();

    return memberships.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      accepted: m.accepted,
      role: m.role as MembershipRole,
      disableImpersonation: m.disableImpersonation,
    }));
  }

  async findMembershipsCreatedAfterTimeIncludeUser(params: {
    organizationId: number;
    time: Date;
  }): Promise<MembershipWithUserDto[]> {
    const memberships = await this.readDb
      .selectFrom("Membership")
      .innerJoin("User", "User.id", "Membership.userId")
      .select([
        "Membership.id",
        "Membership.teamId",
        "Membership.userId",
        "Membership.accepted",
        "Membership.role",
        "Membership.disableImpersonation",
        "User.email",
        "User.name",
        "User.id as user_id",
      ])
      .where("Membership.teamId", "=", params.organizationId)
      .where("Membership.createdAt", ">", params.time)
      .where("Membership.accepted", "=", true)
      .execute();

    return memberships.map((m) => ({
      id: m.id,
      teamId: m.teamId,
      userId: m.userId,
      accepted: m.accepted,
      role: m.role as MembershipRole,
      disableImpersonation: m.disableImpersonation,
      user: {
        email: m.email,
        name: m.name,
        id: m.user_id,
      },
    }));
  }
}
