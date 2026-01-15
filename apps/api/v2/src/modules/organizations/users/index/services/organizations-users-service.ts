import { EmailService } from "@/modules/email/email.service";
import { CreateOrganizationUserInput } from "@/modules/organizations/users/index/inputs/create-organization-user.input";
import { UpdateOrganizationUserInput } from "@/modules/organizations/users/index/inputs/update-organization-user.input";
import { OrganizationsUsersRepository } from "@/modules/organizations/users/index/organizations-users.repository";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { Injectable, ConflictException, ForbiddenException } from "@nestjs/common";
import { plainToInstance } from "class-transformer";

import { createNewUsersConnectToOrgIfExists, CreationSource } from "@calcom/platform-libraries";
import type { Team } from "@calcom/prisma/client";

@Injectable()
export class OrganizationsUsersService {
  constructor(
    private readonly organizationsUsersRepository: OrganizationsUsersRepository,
    private readonly emailService: EmailService
  ) {}

  async getUsers(
    orgId: number,
    emailInput?: string[],
    filters?: {
      teamIds?: number[];
      assignedOptionIds?: string[];
      attributeQueryOperator?: "AND" | "OR" | "NONE";
    },
    skip?: number,
    take?: number
  ) {
    const emailArray = !emailInput ? [] : emailInput;

    if (filters?.assignedOptionIds && filters?.assignedOptionIds?.length) {
      return await this.organizationsUsersRepository.getOrganizationUsersByEmailsAndAttributeFilters(
        orgId,
        {
          assignedOptionIds: filters.assignedOptionIds,
          attributeQueryOperator: filters?.attributeQueryOperator ?? "AND",
          teamIds: filters?.teamIds,
        },
        emailArray,
        skip,
        take
      );
    }

    const users = await this.organizationsUsersRepository.getOrganizationUsersByEmails(
      orgId,
      emailArray,
      filters?.teamIds,
      skip,
      take
    );

    return users;
  }

  async createUser(org: Team, userCreateBody: CreateOrganizationUserInput, inviterName: string) {
    // Check if email exists in the system
    const userEmailCheck = await this.organizationsUsersRepository.getOrganizationUserByEmail(
      org.id,
      userCreateBody.email
    );

    if (userEmailCheck) throw new ConflictException("A user already exists with that email");

    // Check if username is already in use in the org
    if (userCreateBody.username) {
      await this.checkForUsernameConflicts(org.id, userCreateBody.username);
    }

    // Create new org user
    const createdUserCall = await createNewUsersConnectToOrgIfExists({
      invitations: [
        {
          usernameOrEmail: userCreateBody.email,
          role: userCreateBody.organizationRole,
        },
      ],
      teamId: org.id,
      creationSource: CreationSource.API_V2,
      isOrg: true,
      parentId: null,
      autoAcceptEmailDomain: "not-required-for-this-endpoint",
      orgConnectInfoByUsernameOrEmail: {
        [userCreateBody.email]: {
          orgId: org.id,
          autoAccept: userCreateBody.autoAccept,
        },
      },
      language: "en",
    });

    const createdUser = createdUserCall[0];

    // Update user fields that weren't included in createNewUsersConnectToOrgIfExists
    const updateUserBody = plainToInstance(CreateUserInput, userCreateBody, { strategy: "excludeAll" });

    // Update new user with other userCreateBody params
    const user = await this.organizationsUsersRepository.updateOrganizationUser(
      org.id,
      createdUser.id,
      updateUserBody
    );

    // Need to send email to new user to create password
    await this.emailService.sendSignupToOrganizationEmail({
      usernameOrEmail: userCreateBody.email,
      orgName: org.name,
      orgId: org.id,
      locale: user?.locale,
      inviterName,
    });

    return user;
  }

  async updateUser(orgId: number, userId: number, userUpdateBody: UpdateOrganizationUserInput) {
    if (userUpdateBody.username) {
      await this.checkForUsernameConflicts(orgId, userUpdateBody.username);
    }

    const user = await this.organizationsUsersRepository.updateOrganizationUser(
      orgId,
      userId,
      userUpdateBody
    );
    return user;
  }

  async deleteUser(orgId: number, userId: number) {
    const user = await this.organizationsUsersRepository.deleteUser(orgId, userId);
    return user;
  }

  async checkForUsernameConflicts(orgId: number, username: string) {
    const isUsernameTaken = await this.organizationsUsersRepository.getOrganizationUserByUsername(
      orgId,
      username
    );

    if (isUsernameTaken) throw new ConflictException("Username is already taken");
  }

  async getUsersByIds(orgId: number, userIds: number[]) {
    const orgUsers = await this.organizationsUsersRepository.getOrganizationUsersByIds(orgId, userIds);

    if (!orgUsers?.length) {
      throw new ForbiddenException("Provided user ids does not belong to the organization.");
    }

    return orgUsers;
  }
}
