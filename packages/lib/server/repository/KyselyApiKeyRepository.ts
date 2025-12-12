import { v4 as uuidv4 } from "uuid";
import type { Kysely } from "kysely";

import { generateUniqueAPIKey as generateHashedApiKey } from "@calcom/ee/api-keys/lib/apiKeys";
import type { KyselyDatabase } from "@calcom/kysely/types";
import type { UserPermissionRole } from "@calcom/prisma/enums";

import type { ApiKeyDto, ApiKeyWithUserDto, IApiKeyRepository } from "./IApiKeyRepository";

export class KyselyApiKeyRepository implements IApiKeyRepository {
  constructor(
    private readonly readDb: Kysely<KyselyDatabase>,
    private readonly writeDb: Kysely<KyselyDatabase>
  ) {}

  async findByHashedKey(hashedKey: string): Promise<ApiKeyWithUserDto | null> {
    const result = await this.readDb
      .selectFrom("ApiKey as ak")
      .innerJoin("users as u", "u.id", "ak.userId")
      .select([
        "ak.id",
        "ak.hashedKey",
        "ak.userId",
        "ak.expiresAt",
        "u.role",
        "u.locked",
        "u.email",
      ])
      .where("ak.hashedKey", "=", hashedKey)
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      hashedKey: result.hashedKey,
      userId: result.userId,
      expiresAt: result.expiresAt,
      user: {
        role: result.role as UserPermissionRole,
        locked: result.locked,
        email: result.email,
      },
    };
  }

  async findApiKeysFromUserId(params: { userId: number }): Promise<ApiKeyDto[]> {
    const { userId } = params;

    const apiKeys = await this.readDb
      .selectFrom("ApiKey")
      .selectAll()
      .where("userId", "=", userId)
      .where((eb) =>
        eb.or([
          eb("appId", "!=", "zapier"),
          eb("appId", "is", null),
        ])
      )
      .orderBy("createdAt", "desc")
      .execute();

    // Filter out Cal.ai Phone API Keys
    return apiKeys.filter((apiKey) => {
      if (apiKey.note?.startsWith("Cal.ai Phone API Key")) {
        return false;
      }
      return true;
    });
  }

  async createApiKey(params: {
    userId: number;
    teamId?: number;
    note?: string;
    expiresAt?: Date | null;
  }): Promise<string> {
    const { userId, teamId, note, expiresAt } = params;

    const [hashedApiKey, apiKey] = generateHashedApiKey();

    await this.writeDb
      .insertInto("ApiKey")
      .values({
        id: uuidv4(),
        userId,
        teamId: teamId ?? null,
        expiresAt: expiresAt ?? null,
        hashedKey: hashedApiKey,
        note: note ?? null,
      })
      .execute();

    const apiKeyPrefix = process.env.API_KEY_PREFIX ?? "cal_";
    return `${apiKeyPrefix}${apiKey}`;
  }
}
