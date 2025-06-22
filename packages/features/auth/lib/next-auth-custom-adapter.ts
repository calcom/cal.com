import type { Adapter, AdapterUser, AdapterSession, AdapterAccount } from "next-auth/adapters";

import type { PrismaClient } from "@calcom/prisma";
import type { IdentityProvider, Prisma, User, VerificationToken } from "@calcom/prisma/client";
import { PrismaClientKnownRequestError } from "@calcom/prisma/client/runtime/library";

import { identityProviderNameMap } from "./identityProviderNameMap";

/**
 * Generic utility to safely parse an ID string to integer
 */
const parseIntSafe = (id: string): number => {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ID format: ${id}`);
  }
  return parsed;
};

/**
 * Presenters to transform data between NextAuth and Prisma models
 */
const UserPresenter = {
  // Transform Prisma User to NextAuth AdapterUser
  toAdapter(user: User): AdapterUser {
    return {
      ...user,
      id: user.id.toString(),
      emailVerified: user.emailVerified,
    };
  },

  // Transform NextAuth user data to Prisma UserCreateInput
  toPrismaCreate(data: Omit<AdapterUser, "id">): Prisma.UserCreateInput {
    return {
      name: data.name || null,
      email: data.email,
      emailVerified: data.emailVerified || null,
      avatarUrl: data.image || null,
    };
  },

  // Transform NextAuth user data to Prisma UserUpdateInput
  toPrismaUpdate(data: Partial<AdapterUser>): Prisma.UserUpdateInput {
    return {
      name: data.name,
      email: data.email,
      emailVerified: data.emailVerified,
      avatarUrl: data.image,
    };
  },
};

const AccountPresenter = {
  // Transform NextAuth account data to Prisma AccountCreateInput
  toPrismaCreate(account: AdapterAccount): Prisma.AccountCreateInput {
    return {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      type: account.type,
      user: {
        connect: {
          id: parseIntSafe(account.userId),
        },
      },
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
      token_type: account.token_type,
      scope: account.scope,
      id_token: account.id_token,
      session_state: account.session_state,
    };
  },

  // Create a provider_providerAccountId compound key for queries
  getProviderAccountId(provider: string, providerAccountId: string) {
    return {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    };
  },
};

// Type for verification token data
interface VerificationTokenData {
  identifier: string;
  token: string;
  expires: Date;
}

const VerificationTokenPresenter = {
  // Transform NextAuth verification token to Prisma VerificationTokenCreateInput
  toPrismaCreate(token: VerificationTokenData): Prisma.VerificationTokenCreateInput {
    return {
      identifier: token.identifier,
      token: token.token,
      expires: token.expires,
    };
  },

  // Transform Prisma VerificationToken to NextAuth VerificationToken (removing id)
  toAdapter(token: VerificationToken) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...verificationToken } = token;
    return verificationToken;
  },
};

const SessionPresenter = {
  // Ensure session has all required fields
  ensureSession(session: Partial<AdapterSession>): AdapterSession {
    return {
      sessionToken: session.sessionToken || "",
      userId: session.userId || "",
      expires: session.expires || new Date(),
    };
  },
};

/**
 * Create a NextAuth adapter for Prisma
 */
export default function CalComAdapter(prismaClient: PrismaClient) {
  // Helper to safely handle null user results
  const safeUserAdapter = (user: User | null) => {
    return user ? UserPresenter.toAdapter(user) : null;
  };

  return {
    // User operations
    createUser: async (data) => {
      const prismaData = UserPresenter.toPrismaCreate(data);
      const user = await prismaClient.user.create({ data: prismaData });
      return UserPresenter.toAdapter(user);
    },

    getUser: async (id) => {
      const user = await prismaClient.user.findUnique({
        where: { id: parseIntSafe(id) },
      });
      return safeUserAdapter(user);
    },

    getUserByEmail: async (email) => {
      const user = await prismaClient.user.findUnique({ where: { email } });
      return safeUserAdapter(user);
    },

    async getUserByAccount(providerAccountId) {
      // First try to find the user through the account relation
      const account = await prismaClient.account.findUnique({
        where: AccountPresenter.getProviderAccountId(
          providerAccountId.provider,
          providerAccountId.providerAccountId
        ),
        select: { user: true },
      });

      if (account?.user) {
        return UserPresenter.toAdapter(account.user);
      }

      // Fallback for users without Account but with credentials in User Table
      // This should be removed after all Google tokens have expired
      const provider = providerAccountId.provider.toUpperCase() as IdentityProvider;
      if (["GOOGLE", "SAML"].indexOf(provider) < 0) {
        return null;
      }

      const obtainProvider = identityProviderNameMap[provider].toUpperCase() as IdentityProvider;
      const user = await prismaClient.user.findFirst({
        where: {
          identityProviderId: providerAccountId.providerAccountId,
          identityProvider: obtainProvider,
        },
      });

      return safeUserAdapter(user);
    },

    updateUser: async (userData) => {
      const { id, ...data } = userData;
      const prismaData = UserPresenter.toPrismaUpdate(data);
      const user = await prismaClient.user.update({
        where: { id: parseIntSafe(id) },
        data: prismaData,
      });
      return UserPresenter.toAdapter(user);
    },

    deleteUser: async (userId) => {
      const user = await prismaClient.user.delete({ where: { id: parseIntSafe(userId) } });
      return UserPresenter.toAdapter(user);
    },

    // Verification token operations
    async createVerificationToken(data) {
      const prismaData = VerificationTokenPresenter.toPrismaCreate(data);
      const token = await prismaClient.verificationToken.create({
        data: prismaData,
      });
      return VerificationTokenPresenter.toAdapter(token);
    },

    async useVerificationToken(identifier_token) {
      try {
        const token = await prismaClient.verificationToken.delete({
          where: { identifier_token },
        });
        return VerificationTokenPresenter.toAdapter(token);
      } catch (error) {
        // If token already used/deleted, just return null
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
          return null;
        }
        throw error;
      }
    },

    // Account operations
    linkAccount: async (account) => {
      const prismaData = AccountPresenter.toPrismaCreate(account);
      await prismaClient.account.create({ data: prismaData });
    },

    unlinkAccount: async (providerAccountId) => {
      await prismaClient.account.delete({
        where: AccountPresenter.getProviderAccountId(
          providerAccountId.provider,
          providerAccountId.providerAccountId
        ),
      });
    },

    // Session operations (minimal implementation as required by the interface)
    createSession: async (session) => {
      return session;
    },

    getSessionAndUser: async (sessionToken) => {
      return null;
    },

    updateSession: async (session) => {
      return SessionPresenter.ensureSession(session);
    },

    deleteSession: async (sessionToken) => {
      return;
    },
  } satisfies Adapter;
}
