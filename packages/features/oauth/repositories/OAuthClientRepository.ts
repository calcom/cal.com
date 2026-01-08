import { randomBytes } from "node:crypto";

import { generateSecret } from "@calcom/features/oauth/utils/generateSecret";
import type { PrismaClient } from "@calcom/prisma";
import type { OAuthClientApprovalStatus } from "@calcom/prisma/enums";

export class OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByClientId(clientId: string) {
    return await this.prisma.oAuthClient.findFirst({
      where: {
        clientId: clientId,
      },
      select: {
        redirectUri: true,
        clientType: true,
        name: true,
        logo: true,
        clientId: true,
        isTrusted: true,
        websiteUrl: true,
        approvalStatus: true,
        userId: true,
        createdAt: true,
      },
    });
  }

  async findByClientIdWithSecret(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        clientSecret: true,
        clientType: true,
      },
    });
  }

  async findByClientIdIncludeUser(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
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
    return this.prisma.oAuthClient.findMany({
      where: { userId },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        logo: true,
        websiteUrl: true,
        clientType: true,
        approvalStatus: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserIdAndStatus(userId: number, approvalStatus: OAuthClientApprovalStatus) {
    return this.prisma.oAuthClient.findMany({
      where: { userId, approvalStatus },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prisma.oAuthClient.findMany({
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
    return this.prisma.oAuthClient.findMany({
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
    websiteUrl?: string;
    enablePkce?: boolean;
    userId?: number;
    approvalStatus?: OAuthClientApprovalStatus;
  }) {
    const { name, redirectUri, logo, websiteUrl, enablePkce, userId, approvalStatus } = data;

    const clientId = randomBytes(32).toString("hex");

    let clientSecret: string | undefined;
    let hashedSecret: string | undefined;
    if (!enablePkce) {
      const [hashed, plain] = generateSecret();
      hashedSecret = hashed;
      clientSecret = plain;
    }

    const client = await this.prisma.oAuthClient.create({
      data: {
        name,
        redirectUri,
        clientId,
        clientType: enablePkce ? "PUBLIC" : "CONFIDENTIAL",
        logo,
        websiteUrl,
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
    return this.prisma.oAuthClient.update({
      where: { clientId },
      data: { approvalStatus },
    });
  }

  async update(
    clientId: string,
    data: {
      name?: string;
      redirectUri?: string;
      logo?: string;
      websiteUrl?: string;
    }
  ) {
    return this.prisma.oAuthClient.update({
      where: { clientId },
      data,
    });
  }

  async delete(clientId: string) {
    return this.prisma.oAuthClient.delete({
      where: { clientId },
    });
  }
}
