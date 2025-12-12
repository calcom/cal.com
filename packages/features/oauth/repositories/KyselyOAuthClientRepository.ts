import type { Kysely } from "kysely";

import type { KyselyDatabase } from "@calcom/kysely/types";

import type { IOAuthClientRepository, OAuthClientDto } from "./IOAuthClientRepository";

export class KyselyOAuthClientRepository implements IOAuthClientRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findByClientId(clientId: string): Promise<OAuthClientDto | null> {
    const result = await this.readDb
      .selectFrom("OAuthClient")
      .select(["redirectUri", "clientSecret", "clientType"])
      .where("clientId", "=", clientId)
      .executeTakeFirst();

    return result ?? null;
  }
}
