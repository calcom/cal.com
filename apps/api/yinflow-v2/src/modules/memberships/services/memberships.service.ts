import { Injectable } from "@nestjs/common";
import { intersectionBy } from "lodash";

import { MembershipsRepository } from "../../memberships/memberships.repository";

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
      firstUserMemberships.filter((m) => m.accepted),
      secondUserMemberships.filter((m) => m.accepted),
      "teamId"
    );
  }
}
