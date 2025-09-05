import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { RefreshApiKeyInput } from "@/modules/api-keys/inputs/refresh-api-key.input";
import { RefreshApiKeyOutput } from "@/modules/api-keys/outputs/refresh-api-key.output";
import { ApiKeysService } from "@/modules/api-keys/services/api-keys.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { ApiAuthGuardRequest } from "@/modules/auth/strategies/api-auth/api-auth.strategy";

@Controller({
  path: "/v2/api-keys",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@ApiTags("Api Keys")
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @ApiOperation({
    summary: "Refresh API Key",
    description: `Generate a new API key and delete the current one. Provide API key to refresh as a Bearer token in the Authorization header (e.g. "Authorization: Bearer <apiKey>").`,
  })
  @ApiHeader(API_KEY_HEADER)
  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshApiKeyInput,
    @GetUser("id") userId: number,
    @Req() request: ApiAuthGuardRequest
  ): Promise<RefreshApiKeyOutput> {
    const currentApiKey = await this.apiKeysService.getRequestApiKey(request);
    const newApiKey = await this.apiKeysService.refreshApiKey(userId, currentApiKey, body);
    return {
      status: SUCCESS_STATUS,
      data: {
        apiKey: newApiKey,
      },
    };
  }
}
