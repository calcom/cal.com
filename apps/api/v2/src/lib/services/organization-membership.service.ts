import { OrganizationMembershipService as BaseOrganizationMembershipService } from "@calcom/platform-libraries/organizations";
import { Injectable } from "@nestjs/common";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";

@Injectable()
export class OrganizationMembershipService extends BaseOrganizationMembershipService {
  constructor(organizationsRepository: OrganizationsRepository) {
    super({ organizationRepository: organizationsRepository });
  }
}
