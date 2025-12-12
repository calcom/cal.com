import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";
import { MembershipRole } from "@calcom/prisma/enums";

import type { IOrgMembershipRepository } from "./IOrgMembershipRepository";

export class KyselyOrgMembershipRepository implements IOrgMembershipRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async getOrgIdsWhereAdmin(loggedInUserId: number): Promise<number[]> {
    const results = await this.dbRead
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select("Membership.teamId")
      .where("Membership.userId", "=", loggedInUserId)
      .where("Membership.role", "in", [MembershipRole.OWNER, MembershipRole.ADMIN])
      .where("Team.parentId", "is", null)
      .execute();

    return results.map((m) => m.teamId);
  }

  async isLoggedInUserOrgAdminOfBookingHost(
    loggedInUserId: number,
    bookingUserId: number
  ): Promise<boolean> {
    const orgIdsWhereLoggedInUserAdmin = await this.getOrgIdsWhereAdmin(loggedInUserId);

    if (orgIdsWhereLoggedInUserAdmin.length === 0) {
      return false;
    }

    // Check if booking user is a direct member of any org where logged in user is admin
    const bookingUserOrgMembership = await this.dbRead
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select("Membership.userId")
      .where("Membership.userId", "=", bookingUserId)
      .where("Membership.teamId", "in", orgIdsWhereLoggedInUserAdmin)
      .where("Team.parentId", "is", null)
      .executeTakeFirst();

    if (bookingUserOrgMembership) return true;

    // Check if booking user is a member of a team under any org where logged in user is admin
    const bookingUserOrgTeamMembership = await this.dbRead
      .selectFrom("Membership")
      .innerJoin("Team", "Team.id", "Membership.teamId")
      .select("Membership.userId")
      .where("Membership.userId", "=", bookingUserId)
      .where("Team.parentId", "in", orgIdsWhereLoggedInUserAdmin)
      .executeTakeFirst();

    return !!bookingUserOrgTeamMembership;
  }
}
