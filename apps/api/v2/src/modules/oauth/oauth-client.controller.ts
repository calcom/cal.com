import { GetUser } from "@/modules/auth/decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { CreateOAuthClientInput } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientInput } from "@/modules/oauth/dtos/update-oauth-client";
import { OAuthClientRepository } from "@/modules/repositories/oauth/oauth-client-repository.service";
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
  UseGuards,
} from "@nestjs/common";
import { PlatformOAuthClient } from "@prisma/client";

import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients",
  version: "2",
})
@UseGuards(NextAuthGuard)
export class OAuthClientController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  async createOAuthClient(@GetUser("id") userId: number, @Body() body: CreateOAuthClientInput) {
    this.logger.log(`For user ${userId} creating OAuth Client with data: ${JSON.stringify(body)}`);

    const { id, client_secret } = await this.oauthClientRepository.createOAuthClient(userId, body);

    return {
      id,
      client_secret,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  async getOAuthClients(@GetUser("id") userId: number): Promise<ApiResponse<PlatformOAuthClient[], unknown>> {
    const clients = await this.oauthClientRepository.getUserOAuthClients(userId);

    return { status: "success", data: clients };
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  async getOAuthClientById(@Param("clientId") clientId: string) {
    return this.oauthClientRepository.getOAuthClient(clientId);
  }

  @Put("/:clientId")
  @HttpCode(HttpStatus.OK)
  async updateOAuthClient(@Param("clientId") clientId: string, @Body() body: UpdateOAuthClientInput) {
    this.logger.log(`For client ${clientId} updating OAuth Client with data: ${JSON.stringify(body)}`);
    return this.oauthClientRepository.updateOAuthClient(clientId, body);
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOAuthClient(@Param("clientId") clientId: string) {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    return this.oauthClientRepository.deleteOAuthClient(clientId);
  }
}
