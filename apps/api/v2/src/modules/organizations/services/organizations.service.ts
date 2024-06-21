import { OrganizationsRepository } from "@/modules/organizations/organizations.repository";
import { OrganizationUsersRepository } from "@/modules/organizations/repositories/organization-users.repository";
import { Injectable } from "@nestjs/common";

import { UpdateOrganizationUserInput_2024_06_18 } from "@calcom/platform-types";

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly organizationUsersRepository: OrganizationUsersRepository
  ) {}

  async isPlatform(organizationId: number) {
    const organization = await this.organizationsRepository.findById(organizationId);
    return organization?.isPlatform;
  }

  async getOrganizationUsers(organizationId: number, emailInput?: string | string[]) {
    const emailArray = !emailInput ? [] : Array.isArray(emailInput) ? emailInput : [emailInput];

    const users = await this.organizationUsersRepository.getOrganizationUsers(organizationId, emailArray);

    return users;
  }

  async updateOrganizationUser(
    organizationId: number,
    userId: number,
    updateData: UpdateOrganizationUserInput_2024_06_18
  ) {
    const updateUser = await this.organizationUsersRepository.updateOrganizationUser(
      organizationId,
      userId,
      updateData
    );

    return updateUser;
  }
}
