import type { PrismaClient } from "@calcom/prisma";

export class SecondaryEmailRepository {
  constructor(private prismaClient: PrismaClient) {}

  async create({
    userId,
    email,
    emailVerified,
  }: {
    userId: number;
    email: string;
    emailVerified?: Date | null;
  }) {
    return this.prismaClient.secondaryEmail.create({
      data: {
        userId,
        email,
        emailVerified: emailVerified ?? null,
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        userId: true,
      },
    });
  }
}
