import type { PrismaClient, RefreshToken } from "@calcom/prisma";

export class RefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findBySecret(
    secret: string
  ): Promise<Pick<RefreshToken, "id" | "secret" | "userId" | "expiresAt" | "platformOAuthClientId"> | null> {
    return await this.prisma.refreshToken.findUnique({
      where: {
        secret,
      },
      select: {
        id: true,
        secret: true,
        userId: true,
        expiresAt: true,
        platformOAuthClientId: true,
      },
    });
  }

  async create(data: {
    secret: string;
    userId: number;
    platformOAuthClientId: string;
    expiresAt: Date;
  }): Promise<RefreshToken> {
    return await this.prisma.refreshToken.create({
      data: {
        secret: data.secret,
        userId: data.userId,
        platformOAuthClientId: data.platformOAuthClientId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async deleteBySecret(secret: string): Promise<RefreshToken> {
    return await this.prisma.refreshToken.delete({
      where: {
        secret,
      },
    });
  }

  async deleteAndCreate(
    oldSecret: string,
    newData: {
      secret: string;
      userId: number;
      platformOAuthClientId: string;
      expiresAt: Date;
    }
  ): Promise<[RefreshToken, RefreshToken]> {
    return await this.prisma.$transaction([
      this.prisma.refreshToken.delete({
        where: {
          secret: oldSecret,
        },
      }),
      this.prisma.refreshToken.create({
        data: {
          secret: newData.secret,
          userId: newData.userId,
          platformOAuthClientId: newData.platformOAuthClientId,
          expiresAt: newData.expiresAt,
        },
      }),
    ]);
  }
}
