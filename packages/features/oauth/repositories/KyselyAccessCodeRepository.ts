import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IAccessCodeRepository, AccessCodeValidDto } from "./IAccessCodeRepository";

export class KyselyAccessCodeRepository implements IAccessCodeRepository {
  constructor(
    private readonly dbRead: Kysely<KyselyDatabase>,
    private readonly dbWrite: Kysely<KyselyDatabase>
  ) {}

  async findValidCode(code: string, clientId: string): Promise<AccessCodeValidDto | null> {
    const result = await this.dbRead
      .selectFrom("AccessCode")
      .select(["userId", "teamId", "scopes", "codeChallenge", "codeChallengeMethod"])
      .where("code", "=", code)
      .where("clientId", "=", clientId)
      .where("expiresAt", ">", new Date())
      .executeTakeFirst();

    if (!result) return null;

    return {
      userId: result.userId,
      teamId: result.teamId,
      scopes: result.scopes,
      codeChallenge: result.codeChallenge,
      codeChallengeMethod: result.codeChallengeMethod,
    };
  }

  async deleteExpiredAndUsedCodes(code: string, clientId: string): Promise<void> {
    await this.dbWrite
      .deleteFrom("AccessCode")
      .where((eb) =>
        eb.or([
          eb("expiresAt", "<", new Date()),
          eb.and([eb("code", "=", code), eb("clientId", "=", clientId)]),
        ])
      )
      .execute();
  }
}
