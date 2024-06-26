import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { Injectable, ConflictException } from "@nestjs/common";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries-0.0.2";

@Injectable()
export class OrganizationsUsersService {
  constructor(private readonly organizationsUsersRepository: OrganizationsUsersRepository) {}

  async getOrganizationUsers(organizationId: number, emailInput?: string | string[]) {
    const emailArray = !emailInput ? [] : Array.isArray(emailInput) ? emailInput : [emailInput];

    const users = await this.organizationsUsersRepository.getOrganizationUsers(organizationId, emailArray);

    return users;
  }

  async createOrganizationUser(organization, userCreateBody) {
    // Check if username is already in use in the org
    if (userCreateBody.username) {
      const isUsernameTaken = this.organizationsUsersRepository.getOrganizationUserByUsername(
        organization.id,
        userCreateBody.username
      );

      if (isUsernameTaken) throw new ConflictException("Username is already taken");
    }

    const usernamesOrEmails = userCreateBody.username ? [userCreateBody.username] : [userCreateBody.email];

    // Create new org user
    const createdUser = await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails,
      input: {
        teamId: organization.id,
        role: userCreateBody.role,
        usernameOrEmail,
        isOrg: true,
        language: userCreateBody.locale,
      },
      connectionInfoMap: {
        [usernamesOrEmail[0]]: {
          orgId: organization.id,
          autoAccept: userCreateBody.autoAccept,
        },
      },
    })[0];

    // Update new user with other userCreateBody params
    await this.organizationsUsersRepository.updateUser(organization.id, createdUser.id, userCreateBody);
  }
}
