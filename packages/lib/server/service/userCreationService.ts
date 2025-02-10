import type z from "zod";

import { hashPassword } from "@calcom/features/auth/lib/hashPassword";
import { checkIfEmailIsBlockedInWatchlistController } from "@calcom/features/watchlist/operations/check-if-email-in-watchlist.controller";
import logger from "@calcom/lib/logger";
import { CreationSource, MembershipRole } from "@calcom/prisma/enums";
import type { UserPermissionRole, IdentityProvider } from "@calcom/prisma/enums";
import type { userMetadata } from "@calcom/prisma/zod-utils";

import slugify from "../../slugify";
import { UserRepository } from "../repository/user";

interface CreateUserInput {
  email: string;
  username: string;
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
    const { email, password, username } = data;

    const shouldLockByDefault = await checkIfEmailIsBlockedInWatchlistController(email);

    const hashedPassword = password ? await hashPassword(password) : null;

    const user = await UserRepository.create({
      data: {
        ...data,
        username: slugify(username),
        ...(hashedPassword && { hashedPassword }),
        locked: shouldLockByDefault,
      },
      ...(orgData ? { orgData } : {}),
    });

    log.info(`Created user: ${user.id} with locked status of ${user.locked}`);

    const { locked, ...rest } = user;

    return rest;
  }

  static async createUserWithIdP({
    idP,
    email,
    name,
    image,
  }: {
    idP: IdentityProvider;
    email: string;
    name: string;
    image?: string;
  }) {
    // Associate with organization if enabled by flag and idP is Google (for now)
    const { orgUsername, orgId } = await this.checkIfUserShouldBelongToOrg(idP, email);

    const newUser = await this.createUser({
      data: {
        username: orgId ? slugify(orgUsername) : usernameSlug(name),
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

  private async checkIfUserShouldBelongToOrg(idP: IdentityProvider, email: string) {
    const [orgUsername, apexDomain] = email.split("@");

    const ORGANIZATIONS_AUTOLINK =
      process.env.ORGANIZATIONS_AUTOLINK === "1" || process.env.ORGANIZATIONS_AUTOLINK === "true";

    if (!ORGANIZATIONS_AUTOLINK || idP !== "GOOGLE") return { orgUsername, orgId: undefined };
    const existingOrg = await prisma.team.findFirst({
      where: {
        organizationSettings: {
          isOrganizationVerified: true,
          orgAutoAcceptEmail: apexDomain,
        },
      },
      select: {
        id: true,
      },
    });
    return { orgUsername, orgId: existingOrg?.id };
  }
}
