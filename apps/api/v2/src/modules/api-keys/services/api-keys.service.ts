import { sha256Hash, stripApiKey } from "@/lib/api-key";
import { AuthMethods } from "@/lib/enums/auth-methods";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import { CreateApiKeyInput } from "@/modules/api-keys/inputs/create-api-key.input";
import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";
import { ApiAuthGuardRequest } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DateTime } from "luxon";

import { createApiKeyHandler } from "@calcom/platform-libraries";

@Injectable()
export class ApiKeysService {
  constructor(
    private readonly apiKeysRepository: ApiKeysRepository,
    private readonly config: ConfigService
  ) {}

  async getRequestApiKey(request: ApiAuthGuardRequest) {
    if (request.authMethod !== AuthMethods.API_KEY) {
      throw new UnauthorizedException(
        "ApiKeysService - This endpoint can only be accessed using an API key by providing 'Authorization: Bearer <apiKey>' header"
      );
    }
    const apiKey = request.get("Authorization")?.replace("Bearer ", "");
    if (!apiKey) {
      throw new UnauthorizedException("ApiKeysService - No API key provided");
    }
    return apiKey;
  }

  async createApiKey(authUserId: number, createApiKeyInput: CreateApiKeyInput) {
    if (createApiKeyInput.apiKeyDaysValid && createApiKeyInput.apiKeyNeverExpires) {
      throw new BadRequestException(
        "ApiKeysService -Cannot set both apiKeyDaysValid and apiKeyNeverExpires. It has to be either or none of them."
      );
    }

    const defaultApiKeyDaysValid = 30;
    const apiKeyExpiresAfterDays = createApiKeyInput.apiKeyDaysValid
      ? createApiKeyInput.apiKeyDaysValid
      : defaultApiKeyDaysValid;
    const apiKeyExpiresAt = DateTime.utc().plus({ days: apiKeyExpiresAfterDays }).toJSDate();
    const apiKey = await createApiKeyHandler({
      ctx: {
        user: {
          id: authUserId,
        },
      },
      input: {
        note: createApiKeyInput.note,
        neverExpires: !!createApiKeyInput.apiKeyNeverExpires,
        expiresAt: apiKeyExpiresAt,
        teamId: createApiKeyInput.teamId,
      },
    });

    return apiKey;
  }

  async refreshApiKey(authUserId: number, apiKey: string, refreshApiKeyInput: RefreshApiKeyInput) {
    const strippedApiKey = stripApiKey(apiKey, this.config.get<string>("api.keyPrefix"));
    const apiKeyHash = sha256Hash(strippedApiKey);
    const apiKeyInDb = await this.apiKeysRepository.getApiKeyFromHash(apiKeyHash);
    if (!apiKeyInDb) {
      throw new UnauthorizedException("ApiKeysService - provided api key is not valid.");
    }

    const newApiKey = await this.createApiKey(authUserId, {
      ...refreshApiKeyInput,
      note: apiKeyInDb.note || undefined,
      teamId: apiKeyInDb.teamId || undefined,
    });

    await this.apiKeysRepository.deleteById(apiKeyInDb.id);

    return newApiKey;
  }
}
