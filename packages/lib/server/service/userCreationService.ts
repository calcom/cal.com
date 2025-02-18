import type z from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import { getBlockedEmailsInWatchlist } from "@calcom/features/watchlist/operations/get-blocked-emails-in-watchlist";
import logger from "@calcom/lib/logger";
import { randomString } from "@calcom/lib/random";
import { getTranslation } from "@calcom/lib/server/i18n";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import type { UserPermissionRole, IdentityProvider } from "@calcom/prisma/enums";
import type { userMetadata } from "@calcom/prisma/zod-utils";
import type { getOrgConnectionInfo } from "@calcom/trpc/server/routers/viewer/teams/inviteMember/utils";

import slugify from "../../slugify";
import { UserRepository } from "../repository/user";
import { OrganizationUserService } from "./organizationUserService";

interface CreateUserInput {
  email: string;
  username: string | null;
  name?: string;
  password?: string;
  brandColor?: string;
  darkBrandColor?: string;
  hideBranding?: boolean;
  weekStart?: string;
  timeZone?: string;
  theme?: string | null;
  timeFormat?: number;
  locale?: string;
  avatar?: string;
  creationSource: CreationSource;
  role?: UserPermissionRole;
  emailVerified?: Date;
  identityProvider?: IdentityProvider;
  identityProviderId?: string;
  metadata?: z.infer<typeof userMetadata>;
}

interface OrgData {
  id: number;
  role: MembershipRole;
  accepted: boolean;
}

const log = logger.getSubLogger({ prefix: ["[userCreationService]"] });

export class UserCreationService {
  static async createUser({ data, orgData }: { data: CreateUserInput; orgData?: OrgData }) {
    const { email, password, username, ...rest } = data;

    const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController(email);

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await UserRepository.create({
      data: {
        ...rest,
        email,
        ...(username && { username: slugify(username) }),
        ...(hashedPassword && { hashedPassword }),
        locked: shouldLockByDefault,
      },
      ...(orgData ? { orgData } : {}),
    });

    log.info(`Created user: ${user.id} with locked status of ${user.locked}`);

    const { locked, ...restUser } = user;

    return restUser;
  }

  static async createUserWithIdP({
    idP,
    email,
    name,
    image,
    account,
  }: {
    idP: IdentityProvider;
    email: string;
    name: string;
    image?: string | null;
    account: {
      providerAccountId: string;
    };
  }) {
    // Associate with organization if enabled by flag and idP is Google (for now)
    const { orgUsername, orgId } = await OrganizationUserService.checkIfUserShouldBelongToOrg(idP, email);

    const newUser = await this.createUser({
      data: {
        username: orgId ? slugify(orgUsername) : this.slugifyUsername(name),
        emailVerified: new Date(Date.now()),
        name,
        ...(image && { avatarUrl: image }),
        email,
        identityProvider: idP,
        identityProviderId: account.providerAccountId,
        creationSource: idP === "GOOGLE" ? CreationSource.GOOGLE : CreationSource.SAML,
        ...(orgId ? { verified: true } : {}),
      },
      ...(orgId
        ? {
            orgData: {
              id: orgId,
              role: MembershipRole.MEMBER,
              accepted: true,
            },
          }
        : {}),
    });

    return newUser;
  }

  static slugifyUsername(username: string) {
    return `${slugify(username)}-${randomString(6).toLowerCase()}`;
  }

  static async createUsersUnderTeamOrOrg({
    usersToCreate,
    isOrg,
    teamId,
    parentId,
    autoAcceptEmailDomain,
    orgConnectInfoByUsernameOrEmail,
    isPlatformManaged,
    timeFormat,
    weekStart,
    timeZone,
    language,
    creationSource,
  }: {
    usersToCreate: { email: string; role: MembershipRole }[];
    isOrg: boolean;
    teamId: number;
    parentId?: number | null;
    autoAcceptEmailDomain: string | null;
    orgConnectInfoByUsernameOrEmail: Record<string, ReturnType<typeof getOrgConnectionInfo>>;
    isPlatformManaged?: boolean;
    timeFormat?: number;
    weekStart?: string;
    timeZone?: string;
    language: string;
    creationSource: CreationSource;
  }) {
    const userCreationData = [];

    // Compare emails in invites to the watchlist
    const { emails: blockedEmails, domains: blockedDomains } = await getBlockedEmailsInWatchlist(
      usersToCreate.map((user) => user.email)
    );

    for (const userToCreate of usersToCreate) {
      // Weird but orgId is defined only if the invited user email matches orgAutoAcceptEmail
      const { orgId, autoAccept } = orgConnectInfoByUsernameOrEmail[userToCreate.email];
      const [emailUser, emailDomain] = userToCreate.email.split("@");
      const [domainName, TLD] = emailDomain.split(".");

      const shouldLockUser =
        blockedEmails.includes(userToCreate.email) || blockedDomains.includes(domainName);

      // An org member can't change username during signup, so we set the username
      const orgMemberUsername =
        emailDomain === autoAcceptEmailDomain
          ? slugify(emailUser)
          : slugify(`${emailUser}-${domainName}${isPlatformManaged ? `-${TLD}` : ""}`);

      // As a regular team member is allowed to change username during signup, we don't set any username for him
      const regularTeamMemberUsername = null;

      const isBecomingAnOrgMember = parentId || isOrg;

      const t = await getTranslation(language ?? "en", "common");
      const defaultScheduleName = t("default_schedule_name");

      const data = {
        data: {
          username: isBecomingAnOrgMember ? orgMemberUsername : regularTeamMemberUsername,
          email: userToCreate.email,
          verified: true,
          invitedTo: teamId,
          isPlatformManaged: !!isPlatformManaged,
          timeFormat,
          weekStart,
          timeZone,
          creationSource,
          organizationId: orgId || null, // If the user is invited to a child team, they are automatically added to the parent org
          locked: shouldLockUser,
        },
        teamData: {
          id: teamId,
          orgId,
          role: userToCreate.role,
          accepted: autoAccept,
          parentId,
        },
        defaultScheduleName,
      };
      userCreationData.push(data);
    }

    const createdUsers = await UserRepository.createUsersUnderTeamOrOrg(userCreationData);

    return;
  }
}
