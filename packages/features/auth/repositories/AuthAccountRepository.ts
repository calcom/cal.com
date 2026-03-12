import type { PrismaClient } from "@calcom/prisma";
import type { IdentityProvider } from "@calcom/prisma/enums";

const identityProviderUserSelect = {
  id: true,
  email: true,
  username: true,
  name: true,
  identityProvider: true,
  identityProviderId: true,
  twoFactorEnabled: true,
  emailVerified: true,
  locked: true,
  role: true,
  locale: true,
  password: {
    select: {
      hash: true,
    },
  },
  accounts: {
    select: {
      id: true,
      provider: true,
    },
  },
} as const;

const emailUserWithPasswordSelect = {
  id: true,
  email: true,
  username: true,
  identityProvider: true,
  emailVerified: true,
  twoFactorEnabled: true,
  password: {
    select: {
      hash: true,
    },
  },
} as const;

export class AuthAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByIdentityProvider(idP: IdentityProvider, providerAccountId: string) {
    return this.prisma.user.findFirst({
      where: {
        identityProvider: idP,
        identityProviderId: {
          equals: providerAccountId,
          mode: "insensitive",
        },
      },
      select: identityProviderUserSelect,
    });
  }

  async findByIdentityProviderWithAccountsForProvider(
    idP: IdentityProvider,
    providerAccountId: string,
    accountProvider: string
  ) {
    return this.prisma.user.findFirst({
      where: {
        identityProvider: idP,
        identityProviderId: {
          equals: providerAccountId,
          mode: "insensitive",
        },
      },
      select: {
        ...identityProviderUserSelect,
        accounts: {
          where: {
            provider: accountProvider,
          },
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });
  }

  /**
   * Legacy fix: handle old bug where identityProviderId was accidentally set to userId.
   * If found, corrects the identityProviderId to the actual providerAccountId.
   */
  async findAndFixLegacyIdentityProviderId(
    idP: IdentityProvider,
    legacyUserId: string,
    correctProviderAccountId: string
  ) {
    const user = await this.prisma.user.findFirst({
      where: {
        identityProvider: idP,
        identityProviderId: legacyUserId,
      },
      select: identityProviderUserSelect,
    });

    if (!user) return null;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { identityProviderId: correctProviderAccountId },
    });

    return user;
  }

  async findByEmailWithPassword(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: emailUserWithPasswordSelect,
    });
  }

  async updateIdentityProvider(userId: number, idP: IdentityProvider, providerAccountId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        identityProvider: idP,
        identityProviderId: providerAccountId,
      },
    });
  }

  async updateEmail(userId: number, email: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { email },
    });
  }

  async updateIdentityProviderAndEmail(
    userId: number,
    idP: IdentityProvider,
    providerAccountId: string,
    email: string
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: email.toLowerCase(),
        identityProvider: idP,
        identityProviderId: providerAccountId,
      },
    });
  }

  async claimInvitedUser(
    existingEmail: string,
    newEmail: string,
    name: string,
    username: string,
    idP: IdentityProvider,
    providerAccountId: string
  ) {
    return this.prisma.user.update({
      where: { email: existingEmail },
      data: {
        email: newEmail,
        username,
        emailVerified: new Date(Date.now()),
        name,
        identityProvider: idP,
        identityProviderId: providerAccountId,
      },
    });
  }
}
