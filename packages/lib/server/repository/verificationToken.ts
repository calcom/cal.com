import { randomBytes } from "crypto";

import { prisma } from "@calcom/prisma";

export class VerificationTokenRepository {
  static async create({
    identifier,
    token,
    expires,
    teamId,
    expiresInDays,
    secondaryEmailId,
  }: {
    identifier: string;
    token?: string;
    expires: Date;
    teamId?: number;
    expiresInDays?: number | null;
    secondaryEmailId?: number | null;
  }) {
    const generatedToken = token || randomBytes(32).toString("hex");
    return prisma.verificationToken.create({
      data: {
        identifier,
        token: generatedToken,
        expires,
        teamId,
        expiresInDays,
        secondaryEmailId,
      },
    });
  }
}
