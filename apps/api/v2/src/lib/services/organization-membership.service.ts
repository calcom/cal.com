import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { Injectable } from "@nestjs/common";

import { OrganizationMembershipService as BaseOrganizationMembershipService } from "@calcom/platform-libraries/organizations";

@Injectable()
export class OrganizationMembershipService extends BaseOrganizationMembershipService {
  constructor(organizationsRepository: OrganizationsRepository) {
    super({ organizationRepository: organizationsRepository });
  }
}
