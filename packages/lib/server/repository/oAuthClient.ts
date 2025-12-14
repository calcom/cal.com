import { randomBytes, createHash } from "crypto";

import type { PrismaClient } from "@calcom/prisma";
import type { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

const hashSecretKey = (apiKey: string): string => createHash("sha256").update(apiKey).digest("hex");

// Generate a random secret - exported for backward compatibility
export const generateSecret = (secret = randomBytes(32).toString("hex")): [string, string] => [
  hashSecretKey(secret),
  secret,
];

export class OAuthClientRepository {
  constructor(private prismaClient: PrismaClient) {}

  static async withGlobalPrisma() {
    return new OAuthClientRepository((await import("@calcom/prisma")).prisma);
  }

  async findByClientId(clientId: string) {
    return this.prismaClient.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        logo: true,
        clientType: true,
        approvalStatus: true,
        userId: true,
        createdAt: true,
      },
    });
  }

  async findByClientIdIncludeUser(clientId: string) {
    return this.prismaClient.oAuthClient.findUnique({
      where: { clientId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: number) {
    return this.prismaClient.oAuthClient.findMany({
      where: { userId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        logo: true,
        clientType: true,
        approvalStatus: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserIdAndStatus(userId: number, approvalStatus: OAuthClientApprovalStatus) {
    return this.prismaClient.oAuthClient.findMany({
      where: { userId, approvalStatus },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prismaClient.oAuthClient.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByStatus(approvalStatus: OAuthClientApprovalStatus) {
    return this.prismaClient.oAuthClient.findMany({
      where: { approvalStatus },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: {
    name: string;
    redirectUri: string;
    logo?: string;
    enablePkce?: boolean;
    userId?: number;
    approvalStatus?: OAuthClientApprovalStatus;
  }) {
    const { name, redirectUri, logo, enablePkce, userId, approvalStatus } = data;

    const clientId = randomBytes(32).toString("hex");

    let clientSecret: string | undefined;
    let hashedSecret: string | undefined;
    if (!enablePkce) {
      const [hashed, plain] = generateSecret();
      hashedSecret = hashed;
      clientSecret = plain;
    }

    const client = await this.prismaClient.oAuthClient.create({
      data: {
        name,
        redirectUri,
        clientId,
        clientType: enablePkce ? "PUBLIC" : "CONFIDENTIAL",
        logo,
        approvalStatus: approvalStatus || "PENDING",
        clientSecret: hashedSecret,
        ...(userId && {
          user: {
            connect: { id: userId },
          },
        }),
      },
    });

    return {
      clientId: client.clientId,
      name: client.name,
      redirectUri: client.redirectUri,
      logo: client.logo,
      clientType: client.clientType,
      clientSecret,
      isPkceEnabled: enablePkce,
      approvalStatus: client.approvalStatus,
    };
  }

  async updateStatus(clientId: string, approvalStatus: OAuthClientApprovalStatus) {
    return this.prismaClient.oAuthClient.update({
      where: { clientId },
      data: { approvalStatus },
    });
  }

  async regenerateSecret(clientId: string) {
    const [hashed, plain] = generateSecret();
    const updated = await this.prismaClient.oAuthClient.update({
      where: { clientId },
      data: { clientSecret: hashed },
      select: {
        clientId: true,
        name: true,
        clientType: true,
      },
    });
    return { ...updated, clientSecret: plain };
  }

  async update(
    clientId: string,
    data: {
      name?: string;
      redirectUri?: string;
      logo?: string;
    }
  ) {
    return this.prismaClient.oAuthClient.update({
      where: { clientId },
      data,
    });
  }

  async delete(clientId: string) {
    return this.prismaClient.oAuthClient.delete({
      where: { clientId },
    });
  }
}
