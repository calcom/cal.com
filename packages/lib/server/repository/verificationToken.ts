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
    const results = await prisma.verificationToken.updateMany({
      where: {
        identifier: email,
        teamId,
      },
      data: { expires },
    });
    return results[0];
  }
}
