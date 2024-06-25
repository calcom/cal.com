import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationsUsersService {
  constructor(private readonly organizationsUsersRepository: OrganizationsUsersRepository) {}

  async getOrganizationUsers(organizationId: number, emailInput?: string | string[]) {
    const emailArray = !emailInput ? [] : Array.isArray(emailInput) ? emailInput : [emailInput];

    const users = await this.organizationsUsersRepository.getOrganizationUsers(organizationId, emailArray);

    return users;
  }
}
