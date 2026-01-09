import { MembershipsRepository } from "@/modules/memberships/memberships.repository";
import { Injectable } from "@nestjs/common";
import { intersectionBy } from "lodash";

import type { Membership } from "@calcom/prisma/client";

@Injectable()
export class MembershipsService {
  constructor(private readonly membershipsRepository: MembershipsRepository) {}

  async haveMembershipsInCommon(firstUserId: number, secondUserId: number) {
    const memberships = await this.membershipsInCommon(firstUserId, secondUserId);
    return memberships.length > 0;
  }

  async membershipsInCommon(firstUserId: number, secondUserId: number) {
    const firstUserMemberships = await this.membershipsRepository.findUserMemberships(firstUserId);
    const secondUserMemberships = await this.membershipsRepository.findUserMemberships(secondUserId);

    return intersectionBy(
      firstUserMemberships.filter((m: Membership) => m.accepted),
      secondUserMemberships.filter((m: Membership) => m.accepted),
      "teamId"
    );
  }

  async isUserOrgAdminOrOwnerOfAnotherUser(userId: number, anotherUserId: number) {
    const orgIdsWhereUserIsAdminOrOwner = await this.membershipsRepository.getOrgIdsWhereUserIsAdminOrOwner(
      userId
    );

    if (orgIdsWhereUserIsAdminOrOwner.length === 0) {
      return false;
    }

    const anotherUserOrgMembership = await this.membershipsRepository.getUserMembershipInOneOfOrgs(
      anotherUserId,
      orgIdsWhereUserIsAdminOrOwner
    );

    if (anotherUserOrgMembership) return true;

    const anotherUserOrgTeamMembership = await this.membershipsRepository.getUserMembershipInOneOfOrgsTeams(
      anotherUserId,
      orgIdsWhereUserIsAdminOrOwner
    );

    return !!anotherUserOrgTeamMembership;
  }
}
