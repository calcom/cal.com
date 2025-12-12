import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IVerificationTokenRepository, VerificationTokenDto } from "./IVerificationTokenRepository";

export class KyselyVerificationTokenRepository implements IVerificationTokenRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async updateTeamInviteTokenExpirationDate(params: {
    email: string;
    teamId: number;
    expiresInDays: number;
  }): Promise<VerificationTokenDto | null> {
    const { email, teamId, expiresInDays } = params;
    const expires = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Find the token first
    const token = await this.readDb
      .selectFrom("VerificationToken")
      .selectAll()
      .where("identifier", "=", email)
      .where("teamId", "=", teamId)
      .executeTakeFirst();

    if (!token) {
      return null;
    }

    // Update the token
    const result = await this.writeDb
      .updateTable("VerificationToken")
      .set({ expires })
      .where("identifier", "=", email)
      .where("teamId", "=", teamId)
      .where("token", "=", token.token)
      .returningAll()
      .executeTakeFirst();

    return result ?? null;
  }

  async create(params: { identifier: string; token: string; expires: Date }): Promise<VerificationTokenDto> {
    const { identifier, token, expires } = params;

    const result = await this.writeDb
      .insertInto("VerificationToken")
      .values({
        identifier,
        token,
        expires,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return result;
  }
}
