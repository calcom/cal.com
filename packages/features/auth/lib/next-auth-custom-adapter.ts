import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";

import type { PrismaClient } from "@calcom/prisma";
import type { Account, IdentityProvider, User } from "@calcom/prisma/client";
import { Prisma } from "@calcom/prisma/client";

const parseIntSafe = (id: string | number): number => {
  if (typeof id === "number") return id;
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) throw new Error(`Invalid ID format: ${id}`);
  return parsed;
};

// Simple utility functions for transformations
const toAdapterUser = (user: User): AdapterUser => ({
  id: user.id.toString(),
  uuid: user.uuid,
  name: user.name,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.avatarUrl,
});

const toAdapterAccount = (account: Account): AdapterAccount => ({
  userId: account.userId.toString(),
  type: account.type as AdapterAccount["type"],
  provider: account.provider,
  providerAccountId: account.providerAccountId,
  refresh_token: account.refresh_token ?? undefined,
  access_token: account.access_token ?? undefined,
  expires_at: account.expires_at ?? undefined,
  token_type: account.token_type ?? undefined,
  scope: account.scope ?? undefined,
  id_token: account.id_token ?? undefined,
  session_state: account.session_state ?? undefined,
});

const createUserData = (data: Omit<AdapterUser, "id">): Prisma.UserCreateInput => ({
  name: data.name || null,
  email: data.email,
  emailVerified: data.emailVerified || null,
  avatarUrl: data.image || null,
});

const createAccountData = (account: AdapterAccount): Prisma.AccountCreateInput => ({
  provider: account.provider,
  providerAccountId: account.providerAccountId,
  type: account.type,
  user: { connect: { id: parseIntSafe(account.userId) } },
  access_token: account.access_token,
  refresh_token: account.refresh_token,
  expires_at: account.expires_at,
  token_type: account.token_type,
  scope: account.scope,
  id_token: account.id_token,
  session_state: account.session_state,
});

const getAccountWhere = (provider: string, providerAccountId: string) => ({
  provider_providerAccountId: { provider, providerAccountId },
});

export default function CalComAdapter(prismaClient: PrismaClient): Adapter {
  return {
    createUser: async (data: Omit<AdapterUser, "id">) => {
      const user = await prismaClient.user.create({ data: createUserData(data) });
      return toAdapterUser(user);
    },

    getUser: async (id) => {
      const user = await prismaClient.user.findUnique({ where: { id: parseIntSafe(id) } });
      return user ? toAdapterUser(user) : null;
    },

    getUserByEmail: async (email) => {
      const user = await prismaClient.user.findUnique({ where: { email } });
      return user ? toAdapterUser(user) : null;
    },

    async getUserByAccount(providerAccountId) {
      const account = await prismaClient.account.findUnique({
        where: getAccountWhere(providerAccountId.provider, providerAccountId.providerAccountId),
        select: { user: true },
      });

      if (account?.user) {
        return toAdapterUser(account.user);
      }

      // Fallback for legacy users without Account entries
      const provider = providerAccountId.provider.toUpperCase();

      const isGoogleOrSaml = (p: string): p is Extract<IdentityProvider, "GOOGLE" | "SAML"> =>
        ["GOOGLE", "SAML"].includes(p);
      if (!isGoogleOrSaml(provider)) return null;

      const user = await prismaClient.user.findFirst({
        where: {
          identityProviderId: providerAccountId.providerAccountId,
          identityProvider: provider,
        },
      });

      return user ? toAdapterUser(user) : null;
    },

    updateUser: async (userData) => {
      const { id, ...data } = userData;
      const user = await prismaClient.user.update({
        where: { id: parseIntSafe(id) },
        data: {
          name: data.name,
          email: data.email,
          emailVerified: data.emailVerified,
          avatarUrl: data.image,
        },
      });
      return toAdapterUser(user);
    },

    deleteUser: async (userId) => {
      const user = await prismaClient.user.delete({ where: { id: parseIntSafe(userId) } });
      return toAdapterUser(user);
    },

    createVerificationToken: async (data) => {
      const token = await prismaClient.verificationToken.create({ data });
      const { id: _id, ...verificationToken } = token;
      return verificationToken;
    },

    useVerificationToken: async (identifier_token) => {
      try {
        const token = await prismaClient.verificationToken.delete({ where: { identifier_token } });
        const { id: _id, ...verificationToken } = token;
        return verificationToken;
      } catch (error) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === "P2025") return null;
        }
        throw error;
      }
    },

    linkAccount: async (account: AdapterAccount) => {
      const createdAccount = await prismaClient.account.create({ data: createAccountData(account) });
      return toAdapterAccount(createdAccount);
    },

    unlinkAccount: async (providerAccountId: Pick<AdapterAccount, "provider" | "providerAccountId">) => {
      const deletedAccount = await prismaClient.account.delete({
        where: getAccountWhere(providerAccountId.provider, providerAccountId.providerAccountId),
      });
      return toAdapterAccount(deletedAccount);
    },

    createSession: async (session) => session,
    getSessionAndUser: async () => null,
    updateSession: async (session) => ({
      sessionToken: session.sessionToken || "",
      userId: session.userId || "",
      expires: session.expires || new Date(),
    }),
    deleteSession: async () => {
      // No-op implementation for minimal session support
    },
  } satisfies Adapter;
}
