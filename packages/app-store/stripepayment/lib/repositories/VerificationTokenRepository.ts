import prisma from "@calcom/prisma";

export class VerificationTokenRepository {
  static async updateTeamInviteTokenExpirationDate({
    email,
    teamId,
    expiresInDays,
  }: {
    email: string;
    teamId: number;
    expiresInDays: number;
  }) {
    const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const token = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        teamId,
      },
    });

    await prisma.verificationToken.update({
      where: {
        identifier: email,
        teamId,
        token: token?.token,
      },
      data: { expires },
    });

    return { ...token, expires };
  }

  static async create({ identifier, token, expires }: { identifier: string; token: string; expires: Date }) {
    return prisma.verificationToken.create({
      data: {
        identifier,
        token,
        expires,
      },
    });
  }
}
