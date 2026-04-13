import { randomBytes } from "node:crypto";

import { ErrorWithCode } from "@calcom/lib/errors";
import type { PrismaClient, PrismaTransaction } from "@calcom/prisma";
import type { AccessScope, OAuthClientStatus } from "@calcom/prisma/enums";

export const CANNOT_DELETE_LAST_SECRET = "Cannot delete the last secret of a confidential client.";

export class OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByClientId(clientId: string) {
    return await this.prisma.oAuthClient.findFirst({
      where: {
        clientId: clientId,
      },
      select: {
        redirectUris: true,
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
        scopes: true,
        createdAt: true,
      },
    });
  }

  async findByClientIdWithSecrets(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUris: true,
        clientType: true,
        status: true,
        userId: true,
        clientSecrets: {
          select: {
            id: true,
            hashedSecret: true,
            secretHint: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getClientSecrets(clientId: string) {
    return this.prisma.oAuthClientSecret.findMany({
      where: { clientId },
      select: {
        id: true,
        secretHint: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async createClientSecret(data: { clientId: string; hashedSecret: string; secretHint: string }) {
    return this.prisma.oAuthClientSecret.create({
      data: {
        clientId: data.clientId,
        hashedSecret: data.hashedSecret,
        secretHint: data.secretHint,
      },
      select: {
        id: true,
        secretHint: true,
        createdAt: true,
      },
    });
  }

  async deleteClientSecretIfNotLast(secretId: number, clientId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockClient(tx, clientId);
      const count = await tx.oAuthClientSecret.count({ where: { clientId } });
      if (count <= 1) {
        throw ErrorWithCode.Factory.BadRequest(CANNOT_DELETE_LAST_SECRET);
      }
      return tx.oAuthClientSecret.delete({
        where: { id: secretId, clientId },
      });
    });
  }

  async createClientSecretIfUnderLimit(
    data: { clientId: string; hashedSecret: string; secretHint: string },
    maxSecrets: number
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockClient(tx, data.clientId);
      const count = await tx.oAuthClientSecret.count({ where: { clientId: data.clientId } });
      if (count >= maxSecrets) {
        throw ErrorWithCode.Factory.BadRequest(`Maximum of ${maxSecrets} secrets allowed.`);
      }
      return tx.oAuthClientSecret.create({
        data: {
          clientId: data.clientId,
          hashedSecret: data.hashedSecret,
          secretHint: data.secretHint,
        },
        select: {
          id: true,
          secretHint: true,
          createdAt: true,
        },
      });
    });
  }

  private async lockClient(tx: PrismaTransaction, clientId: string) {
    await tx.$queryRaw`SELECT "clientId" FROM "OAuthClient" WHERE "clientId" = ${clientId} FOR UPDATE`;
  }

  async findByClientIdIncludeUser(clientId: string) {
    return this.prisma.oAuthClient.findUnique({
      where: { clientId },
      select: {
        clientId: true,
        redirectUris: true,
        clientType: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        isTrusted: true,
        status: true,
        userId: true,
        scopes: true,
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
        redirectUris: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        scopes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll() {
    return this.prisma.oAuthClient.findMany({
      select: {
        clientId: true,
        redirectUris: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        scopes: true,
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
        redirectUris: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        scopes: true,
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

  async countByStatus(status?: OAuthClientStatus) {
    return this.prisma.oAuthClient.count({
      where: status ? { status } : undefined,
    });
  }

  async findByStatusPaginated(page: number, pageSize: number, status?: OAuthClientStatus) {
    return this.prisma.oAuthClient.findMany({
      where: status ? { status } : undefined,
      select: {
        clientId: true,
        redirectUris: true,
        name: true,
        purpose: true,
        logo: true,
        websiteUrl: true,
        rejectionReason: true,
        clientType: true,
        status: true,
        userId: true,
        scopes: true,
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
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }

  async create(data: {
    name: string;
    purpose: string;
    redirectUris: string[];
    secret?: { hashedSecret: string; secretHint: string };
    logo?: string;
    websiteUrl?: string;
    enablePkce?: boolean;
    scopes?: AccessScope[];
    userId?: number;
    status: OAuthClientStatus;
  }) {
    const { name, purpose, redirectUris, secret, logo, websiteUrl, enablePkce, scopes, userId, status } =
      data;

    const clientId = randomBytes(32).toString("hex");

    const client = await this.prisma.oAuthClient.create({
      data: {
        name,
        purpose,
        redirectUris,
        clientId,
        clientType: enablePkce ? "PUBLIC" : "CONFIDENTIAL",
        logo,
        websiteUrl,
        status,
        ...(scopes && { scopes }),
        ...(userId && {
          user: {
            connect: { id: userId },
          },
        }),
        ...(secret && {
          clientSecrets: {
            create: {
              hashedSecret: secret.hashedSecret,
              secretHint: secret.secretHint,
            },
          },
        }),
      },
    });

    return {
      clientId: client.clientId,
      name: client.name,
      purpose: client.purpose,
      redirectUris: client.redirectUris,
      logo: client.logo,
      clientType: client.clientType,
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
      redirectUris?: string[];
      logo?: string | null;
      websiteUrl?: string | null;
      scopes?: AccessScope[];
      status?: OAuthClientStatus;
      rejectionReason?: string | null;
    }
  ) {
    return this.prisma.oAuthClient.update({
      where: { clientId },
      data,
      select: {
        clientId: true,
        name: true,
        purpose: true,
        status: true,
        redirectUris: true,
        websiteUrl: true,
        logo: true,
        rejectionReason: true,
      },
    });
  }

  async delete(clientId: string) {
    return this.prisma.oAuthClient.delete({
      where: { clientId },
    });
  }
}
