import { randomBytes, createHash } from "crypto";

import { VerificationTokenRepository } from "../repository/verificationToken";

export class VerificationTokenService {
  static async create({ identifier, expires }: { identifier: string; expires: Date }) {
    const token = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256")
      .update(`${token}${process.env.NEXTAUTH_SECRET}`)
      .digest("hex");

    await VerificationTokenRepository.create({ identifier, token: hashedToken, expires });

    return token;
  }
}
