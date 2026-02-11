import { randomBytes } from "node:crypto";

import type { PrismaClient } from "@calcom/prisma";
import type { OAuthClientStatus } from "@calcom/prisma/enums";

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
        purpose: true,
        logo: true,
        clientId: true,
        isTrusted: true,
        websiteUrl: true,
        rejectionReason: true,
        status: true,
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
        status: true,
      },
    });
  }

  async findByClientIdIncludeUser(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUri: true,
        clientType: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        isTrusted: true,
        status: true,
        userId: true,
        createdAt: true,
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
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByUserIdAndStatus(userId: number, status: OAuthClientStatus) {
    return this.prisma.oAuthClient.findMany({
      where: { userId, status },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prisma.oAuthClient.findMany({
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        createdAt: true,
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

  async findByStatus(status: OAuthClientStatus) {
    return this.prisma.oAuthClient.findMany({
      where: { status },
      select: {
        clientId: true,
        redirectUri: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        createdAt: true,
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
    purpose: string;
    redirectUri: string;
    clientSecret?: string;
    logo?: string;
    websiteUrl?: string;
    enablePkce?: boolean;
    userId?: number;
    status: OAuthClientStatus;
  }) {
    const { name, purpose, redirectUri, clientSecret, logo, websiteUrl, enablePkce, userId, status } = data;

    const clientId = randomBytes(32).toString("hex");

    const client = await this.prisma.oAuthClient.create({
      data: {
        name,
        purpose,
        redirectUri,
        clientId,
        clientType: enablePkce ? "PUBLIC" : "CONFIDENTIAL",
        logo,
        websiteUrl,
        status,
        clientSecret,
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
      purpose: client.purpose,
      redirectUri: client.redirectUri,
      logo: client.logo,
      clientType: client.clientType,
      clientSecret: client.clientSecret,
      isPkceEnabled: enablePkce,
      status: client.status,
    };
  }

  async updateStatus(clientId: string, status: OAuthClientStatus) {
    return this.prisma.oAuthClient.update({
      where: { clientId },
      data: { status },
    });
  }

  async update(
    clientId: string,
    data: {
      name?: string;
      purpose?: string;
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
