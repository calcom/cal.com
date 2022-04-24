import { IdentityProvider } from "@prisma/client";
import type { Adapter } from "next-auth/adapters";

import { Account, Prisma, PrismaClient, User, VerificationToken } from "@calcom/prisma/client";

import { identityProviderNameMap } from "@lib/auth";

/** @return { import("next-auth/adapters").Adapter } */
export default function CalComAdapter(prismaClient: PrismaClient, options = {}) {
  return {
    createUser: (data: Prisma.UserCreateInput) => prismaClient.user.create({ data }),
    getUser: (id: User["id"]) => prismaClient.user.findUnique({ where: { id } }),
    getUserByEmail: (email: User["email"]) => prismaClient.user.findUnique({ where: { email } }),
    async getUserByAccount(data: {
      providerAccountId: Account["providerAccountId"];
      provider: User["identityProvider"];
    }) {
      const provider = data.provider.toUpperCase() as IdentityProvider;
      if (["GOOGLE", "SAML"].indexOf(provider) < 0) {
        return null;
      }
      const obtainProvider = identityProviderNameMap[provider].toUpperCase() as IdentityProvider;
      const user = await prismaClient.user.findFirst({
        where: {
          identityProviderId: data.providerAccountId,
          identityProvider: obtainProvider,
        },
      });
      return user || null;
    },
    updateUser: ({ id, ...data }: Prisma.UserUncheckedCreateInput) =>
      prismaClient.user.update({ where: { id }, data }),
    deleteUser: (id: User["id"]) => prismaClient.user.delete({ where: { id } }),
    async createVerificationToken(data: VerificationToken) {
      const { id: _, ...verificationToken } = await prismaClient.verificationToken.create({
        data,
      });
      return verificationToken;
    },
    async useVerificationToken(identifier_token: Prisma.VerificationTokenIdentifierTokenCompoundUniqueInput) {
      try {
        const { id: _, ...verificationToken } = await prismaClient.verificationToken.delete({
          where: { identifier_token },
        });
        return verificationToken;
      } catch (error) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        // @ts-ignore
        if (error.code === "P2025") return null;
        throw error;
      }
    },
    // @NOTE: All methods below here are not properly configured
    linkAccount: (data: Prisma.AccountCreateInput) => prismaClient.account.create({ data }),
    unlinkAccount: (provider_providerAccountId: Prisma.AccountProviderProviderAccountIdCompoundUniqueInput) =>
      prismaClient.account.delete({ where: { provider_providerAccountId } }),
    async getSessionAndUser(sessionToken: string) {
      const userAndSession = await prismaClient.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!userAndSession) return null;
      const { user, ...session } = userAndSession;
      return { user, session };
    },
    createSession: (data: Prisma.SessionCreateInput) => prismaClient.session.create({ data }),
    updateSession: (data: Prisma.SessionWhereUniqueInput) =>
      prismaClient.session.update({ where: { sessionToken: data.sessionToken }, data }),
    deleteSession: (sessionToken: string) => prismaClient.session.delete({ where: { sessionToken } }),
  };
}
