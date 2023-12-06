import { CreateOAuthClientInput } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientInput } from "@/modules/oauth/dtos/update-oauth-client";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
import { Response } from "@/types";
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from "@nestjs/common";

@Controller({
  path: "oauth-clients",
  version: "2",
})
export class OAuthClientController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  async createOAuthClient(@Res({ passthrough: true }) res: Response, @Body() body: CreateOAuthClientInput) {
    const userId = res.locals.apiKey?.userId;
    this.logger.log(`Creating OAuth Client with data: ${JSON.stringify(body)}`);

    const { id, client_secret } = await this.oauthClientRepository.createOAuthClient(userId);

    return {
      id,
      client_secret,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  async getOAuthClients(@Res({ passthrough: true }) res: Response) {
    const userId = res.locals.apiKey?.userId;
    return this.oauthClientRepository.getUserOAuthClients(userId);
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  async getOAuthClientById(@Param("clientId") clientId: string) {
    return this.oauthClientRepository.getOAuthClient(clientId);
  }

  @Put("/:clientId")
  @HttpCode(HttpStatus.OK)
  async updateOAuthClient(
    @Param("clientId") clientId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Body() body: UpdateOAuthClientInput
  ) {
    this.logger.log(`Updating OAuth Client with ID: ${clientId}`);
    return this.oauthClientRepository.updateOAuthClient(clientId);
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOAuthClient(@Param("clientId") clientId: string) {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    return this.oauthClientRepository.deleteOAuthClient(clientId);
  }
}
