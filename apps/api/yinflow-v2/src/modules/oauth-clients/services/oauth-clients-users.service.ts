import { BadRequestException, Injectable } from "@nestjs/common";
import { User } from "@prisma/client";

import { ProfileRepository } from "@calcom/lib/server/repository/profile";
import { slugify } from "@calcom/platform-libraries";
import { MembershipRole } from "@calcom/prisma/enums";
import {
  Invitation,
  getOrgConnectionInfo,
} from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";
import { isEmail } from "@calcom/trpc/server/routers/viewer/teams/util";

import { supabase } from "../../../config/supabase";
import { EventTypesService_2024_04_15 } from "../../../ee/event-types/event-types_2024_04_15/services/event-types.service";
import { SchedulesService_2024_04_15 } from "../../../ee/schedules/schedules_2024_04_15/services/schedules.service";
import { OrganizationsTeamsService } from "../../organizations/services/organizations-teams.service";
import { TokensRepository } from "../../tokens/tokens.repository";
import { CreateManagedUserInput } from "../../users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "../../users/inputs/update-managed-user.input";
import { UsersRepository } from "../../users/users.repository";

@Injectable()
export class OAuthClientUsersService {
  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly eventTypesService: EventTypesService_2024_04_15,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly organizationsTeamsService: OrganizationsTeamsService
  ) {}

  async createOauthClientUser(
    oAuthClientId: string,
    body: CreateManagedUserInput,
    isPlatformManaged: boolean,
    organizationId?: number
  ) {
    const existsWithEmail = await this.managedUserExistsWithEmail(oAuthClientId, body.email);
    if (existsWithEmail) {
      throw new BadRequestException("User with the provided e-mail already exists.");
    }

    let user: User;
    if (!organizationId) {
      throw new BadRequestException("You cannot create a managed user outside of an organization");
    } else {
      const email = this.getOAuthUserEmail(oAuthClientId, body.email);

      user = (
        await this.createNewUsersConnectToOrgIfExists({
          invitations: [
            {
              usernameOrEmail: email,
              role: "MEMBER",
            },
          ],
          teamId: organizationId,
          isOrg: true,
          parentId: null,
          autoAcceptEmailDomain: "never-auto-accept-email-domain-for-managed-users",
          orgConnectInfoByUsernameOrEmail: {
            [email]: {
              orgId: organizationId,
              autoAccept: true,
            },
          },
          isPlatformManaged,
          timeFormat: body.timeFormat,
          weekStart: body.weekStart,
          timeZone: body.timeZone,
        })
      )[0];

      await this.userRepository.addToOAuthClient(user.id, oAuthClientId);
      const updatedUser = await this.userRepository.update(user.id, {
        name: body.name ?? user.username ?? undefined,
        locale: body.locale,
      });

      if (updatedUser) user.locale = (updatedUser as any).locale;
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      user.id
    );

    await this.eventTypesService.createUserDefaultEventTypes(user.id);

    if (body.timeZone) {
      const defaultSchedule = await this.schedulesService.createUserDefaultSchedule(user.id, body.timeZone);
      user.defaultScheduleId = defaultSchedule.id;

      return {
        tokens: null,
        user: null,
        message: defaultSchedule,
      };
    }

    await this.organizationsTeamsService.addUserToPlatformTeamEvents(user.id, organizationId, oAuthClientId);

    return {
      user,
      tokens: {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
      },
    };
  }

  async managedUserExistsWithEmail(oAuthClientId: string, email: string) {
    const oAuthEmail = this.getOAuthUserEmail(oAuthClientId, email);
    const user = await this.userRepository.findByEmail(oAuthEmail);
    return !!user;
  }

  async updateOAuthClientUser(oAuthClientId: string, userId: number, body: UpdateManagedUserInput) {
    if (body.email) {
      const emailWithOAuthId = this.getOAuthUserEmail(oAuthClientId, body.email);
      body.email = emailWithOAuthId;
      const newUsername = slugify(emailWithOAuthId);
      await this.userRepository.updateUsername(userId, newUsername);
    }

    return this.userRepository.update(userId, body);
  }

  async createNewUsersConnectToOrgIfExists({
    invitations,
    isOrg,
    teamId,
    parentId,
    autoAcceptEmailDomain,
    orgConnectInfoByUsernameOrEmail,
    isPlatformManaged,
    timeFormat,
    weekStart,
    timeZone,
  }: {
    invitations: Invitation[];
    isOrg: boolean;
    teamId: number;
    parentId?: number | null;
    autoAcceptEmailDomain: string | null;
    orgConnectInfoByUsernameOrEmail: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
    isPlatformManaged?: boolean;
    timeFormat?: number;
    weekStart?: string;
    timeZone?: string;
  }) {
    // fail if we have invalid emails
    invitations.forEach((invitation) => isEmail(invitation.usernameOrEmail));
    // from this point we know usernamesOrEmails contains only emails
    const createdUsers = [];
    for (let index = 0; index < invitations.length; index++) {
      const invitation = invitations[index];
      // Weird but orgId is defined only if the invited user email matches orgAutoAcceptEmail
      const { orgId, autoAccept } = orgConnectInfoByUsernameOrEmail[invitation.usernameOrEmail];
      const [emailUser, emailDomain] = invitation.usernameOrEmail.split("@");

      // An org member can't change username during signup, so we set the username
      const orgMemberUsername =
        emailDomain === autoAcceptEmailDomain
          ? slugify(emailUser)
          : slugify(`${emailUser}-${emailDomain.split(".")[0]}`);

      // As a regular team member is allowed to change username during signup, we don't set any username for him
      const regularTeamMemberUsername = null;

      const isBecomingAnOrgMember = parentId || isOrg;

      const { data: createdUser } = (await supabase
        .from("users")
        .insert({
          username: isBecomingAnOrgMember ? orgMemberUsername : regularTeamMemberUsername,
          email: invitation.usernameOrEmail,
          verified: true,
          invitedTo: teamId,
          isPlatformManaged: !!isPlatformManaged,
          timeFormat,
          weekStart,
          timeZone,
          organizationId: orgId || null,
        })
        .select()
        .single()) as any;

      const userId = createdUser.id;

      if (orgId) {
        await supabase.from("Profile").insert([
          {
            uid: ProfileRepository.generateProfileUid(),
            username: orgMemberUsername,
            organizationId: orgId,
            userId: userId,
          },
        ]);
      }

      await supabase.from("Membership").insert([
        {
          teamId: teamId,
          role: invitation.role,
          accepted: autoAccept,
          userId: userId,
          disableImpersonation: false,
        },
      ]);

      // We also need to create the membership in the parent org if it exists
      if (parentId) {
        await supabase.from("Membership").insert({
          teamId: parentId,
          userId: createdUser.id,
          role: MembershipRole.MEMBER,
          accepted: autoAccept,
          disableImpersonation: false,
        });
      }
      createdUsers.push(createdUser);
    }

    return createdUsers;
  }

  getOAuthUserEmail(oAuthClientId: string, userEmail: string) {
    const [username, emailDomain] = userEmail.split("@");
    return `${username}+${oAuthClientId}@${emailDomain}`;
  }
}
