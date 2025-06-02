import type { Account, IdentityProvider, Prisma, User, VerificationToken } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { Adapter } from "next-auth/adapters"
import type { PrismaClient } from "@calcom/prisma";

import { identityProviderNameMap } from "./identityProviderNameMap";

/**
 * A custom adapter that bridges NextAuth with our Prisma schema.
 * It correctly maps data types between what NextAuth expects and what Prisma returns.
 * @return { import("next-auth/adapters").Adapter }
 */
export default function CalComAdapter(prismaClient: PrismaClient): Adapter {
  // Helper function to map Prisma User to AdapterUser
  // The main job is to convert the numeric ID to a string.
  const mapPrismaUserToAdapterUser = (user: User | null): AdapterUser | null => {
    if (!user) {
      return null;
    }
    // Note: Any other fields that differ between Prisma model and AdapterUser should be mapped here.
    return {
      ...user,
      id: String(user.id), // CRITICAL: Convert number ID to string
    };
  };

  return {
    // Note: The incoming 'data' from NextAuth does not have an 'id'.
    async createUser(data) {
      const user = await prismaClient.user.create({ data });
      return mapPrismaUserToAdapterUser(user)!; // '!' is safe here because we just created it.
    },
    async getUser(id) {
      const user = await prismaClient.user.findUnique({
        where: { id: parseInt(id, 10) }, // Convert string ID from NextAuth to number for Prisma
      });
      return mapPrismaUserToAdapterUser(user);
    },
    async getUserByEmail(email) {
      const user = await prismaClient.user.findUnique({ where: { email } });
      return mapPrismaUserToAdapterUser(user);
    },
    async getUserByAccount(providerAccountId) {
      const account = await prismaClient.account.findUnique({
        where: {
          provider_providerAccountId: providerAccountId,
        },
        select: { user: true },
      });

      if (account) {
        return mapPrismaUserToAdapterUser(account.user);
      }

      // --- Fallback logic remains the same, but we must map the result ---
      const provider = providerAccountId?.provider.toUpperCase() as IdentityProvider;
      if (["GOOGLE", "SAML"].indexOf(provider) < 0) {
        return null;
      }
      const obtainProvider = identityProviderNameMap[provider].toUpperCase() as IdentityProvider;
      const user = await prismaClient.user.findFirst({
        where: {
          identityProviderId: providerAccountId?.providerAccountId,
          identityProvider: obtainProvider,
        },
      });
      return mapPrismaUserToAdapterUser(user);
    },
    async updateUser(data) {
      const { id, ...userData } = data;
      const updatedUser = await prismaClient.user.update({
        where: { id: parseInt(id, 10) }, // Convert string ID to number
        data: userData,
      });
      return mapPrismaUserToAdapterUser(updatedUser)!;
    },
    async deleteUser(id) {
      // You can return the deleted user or null. Returning it requires a transaction
      // to fetch before deleting. For simplicity, we can just delete and return void.
      await prismaClient.user.delete({
        where: { id: parseInt(id, 10) }, // Convert string ID to number
      });
      // Next-Auth adapter allows returning null, undefined, or void for this method.
      return null;
    },
    async linkAccount(data) {
      const { userId, ...restOfData } = data;
      await prismaClient.account.create({
        data: {
          ...restOfData,
          userId: parseInt(userId, 10), // Convert string userId to number
        },
      });
      // Next-Auth adapter allows returning null, undefined, or void for this method.
    },
    async unlinkAccount(providerAccountId) {
      await prismaClient.account.delete({
        where: { provider_providerAccountId: providerAccountId },
      });
      // Next-Auth adapter allows returning null, undefined, or void for this method.
    },
    async createVerificationToken(data) {
      // This implementation looks mostly correct as it returns what NextAuth expects.
      const { id: _, ...verificationToken } = await prismaClient.verificationToken.create({
        data,
      });
      return verificationToken;
    },
    async useVerificationToken(identifier_token) {
      try {
        const { id: _, ...verificationToken } = await prismaClient.verificationToken.delete({
          where: { identifier_token },
        });
        return verificationToken;
      } catch (error) {
        if (error instanceof PrismaClientKnownRequestError && error.code === "P2025") {
          return null; // Token not found, which is a valid outcome.
        }
        throw error;
      }
    },
  };
}
