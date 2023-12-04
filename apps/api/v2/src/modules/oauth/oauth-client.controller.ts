import { NextAuthGuard } from "@/modules/auth/next-auth.guard";
import { CreateOAuthClientDto } from "@/modules/oauth/dtos/create-oauth-client";
import { UpdateOAuthClientDto } from "@/modules/oauth/dtos/update-oauth-client";
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
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";

@Controller({
  path: "oauth-clients",
  version: "2",
})
export class OAuthClientController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  async createOAuthClient(
    @Res({ passthrough: true }) res: Response,
    @Body() createOAuthClientDto: CreateOAuthClientDto
  ) {
    const userId = res.locals.apiKey?.userId;
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
  @UseGuards(NextAuthGuard)
  async getOAuthClients(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = res.locals.user;
    console.log("email", user.email);
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
