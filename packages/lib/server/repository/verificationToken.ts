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
    const expires = new Date(new Date().setHours(expiresInDays * 24));
    return prisma.verificationToken.update({
      where: {
        identifier: email,
        teamId,
      },
      data: { expires },
    });
  }
}
