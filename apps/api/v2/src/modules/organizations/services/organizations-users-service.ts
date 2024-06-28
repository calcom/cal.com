import { CreateOrganizationUserInput } from "@/modules/organizations/inputs/create-organization-user.input";
import { OrganizationsUsersRepository } from "@/modules/organizations/repositories/organizations-users.repository";
import { Injectable, ConflictException } from "@nestjs/common";

import { createNewUsersConnectToOrgIfExists, slugify } from "@calcom/platform-libraries-0.0.2";

@Injectable()
export class OrganizationsUsersService {
  constructor(private readonly organizationsUsersRepository: OrganizationsUsersRepository) {}

  async getOrganizationUsers(orgId: number, emailInput?: string | string[]) {
    const emailArray = !emailInput ? [] : Array.isArray(emailInput) ? emailInput : [emailInput];

    const users = await this.organizationsUsersRepository.getOrganizationUsers(orgId, emailArray);

    return users;
  }

  async createOrganizationUser(orgId: number, userCreateBody: CreateOrganizationUserInput) {
    // Check if email exists in the system
    const userEmailCheck = await this.organizationsUsersRepository.getOrganizationUserByEmail(
      orgId,
      userCreateBody.email
    );

    if (userEmailCheck) throw new ConflictException("A user already exists with that email");

    // Check if username is already in use in the org
    if (userCreateBody.username) {
      const isUsernameTaken = await this.organizationsUsersRepository.getOrganizationUserByUsername(
        orgId,
        userCreateBody.username
      );

      if (isUsernameTaken) throw new ConflictException("Username is already taken");
    }

    const usernamesOrEmails = userCreateBody.username ? [userCreateBody.username] : [userCreateBody.email];

    // Create new org user
    const createdUserCall = await createNewUsersConnectToOrgIfExists({
      usernamesOrEmails,
      input: {
        teamId: orgId,
        role: userCreateBody.organizationRole,
        usernameOrEmail: usernamesOrEmails[0],
        isOrg: true,
        language: userCreateBody.locale,
      },
      connectionInfoMap: {
        [usernamesOrEmails[0]]: {
          orgId: orgId,
          autoAccept: userCreateBody.autoAccept,
        },
      },
    });

    const createdUser = createdUserCall[0];
    console.log("🚀 ~ OrganizationsUsersService ~ createOrganizationUser ~ createdUser:", createdUser);

    // Update new user with other userCreateBody params
    const user = await this.organizationsUsersRepository.updateUser(orgId, createdUser.id, userCreateBody);

    return user;
  }
}
