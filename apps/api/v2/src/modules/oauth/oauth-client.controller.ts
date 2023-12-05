import { GetUser } from "@/modules/auth/decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { CreateOAuthClientDto } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientDto } from "@/modules/oauth/dtos/update-oauth-client";
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
  async createOAuthClient(@GetUser("id") userId: number, @Body() createOAuthClientDto: CreateOAuthClientDto) {
    this.logger.log(`Creating OAuth Client with data: ${JSON.stringify(createOAuthClientDto)}`);

    const { id, client_secret } = await this.oauthClientRepository.createOAuthClient(
      userId,
      createOAuthClientDto
    );

    return {
      id,
      client_secret,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  async getOAuthClients(@GetUser("id") userId: number) {
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
    @Body() updateOAuthClientDto: UpdateOAuthClientDto
  ) {
    this.logger.log(`Updating OAuth Client with ID: ${clientId}`);
    return this.oauthClientRepository.updateOAuthClient(clientId, updateOAuthClientDto);
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOAuthClient(@Param("clientId") clientId: string) {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    return this.oauthClientRepository.deleteOAuthClient(clientId);
  }
}
