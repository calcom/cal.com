import { GetUser } from "@/modules/auth/decorator";
import { Roles } from "@/modules/auth/decorator/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { OrganizationGuard } from "@/modules/auth/guard/organization";
import { RolesGuard } from "@/modules/auth/guard/roles";
import { CreateOAuthClientInput } from "@/modules/oauth/input/create-oauth-client";
import { UpdateOAuthClientInput } from "@/modules/oauth/input/update-oauth-client";
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
import { MembershipRole, PlatformOAuthClient } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients",
  version: "2",
})
@UseGuards(NextAuthGuard, OrganizationGuard, RolesGuard)
export class OAuthClientController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  async createOAuthClient(
    @GetUser("organizationId") organizationId: number,
    @Body() body: CreateOAuthClientInput
  ): Promise<ApiResponse<{ client_id: string; client_secret: string }>> {
    this.logger.log(
      `For organisation ${organizationId} creating OAuth Client with data: ${JSON.stringify(body)}`
    );
    const { id, secret } = await this.oauthClientRepository.createOAuthClient(organizationId, body);
    return {
      status: SUCCESS_STATUS,
      data: {
        client_id: id,
        client_secret: secret,
      },
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  async getOAuthClients(
    @GetUser("organizationId") organizationId: number
  ): Promise<ApiResponse<PlatformOAuthClient[]>> {
    const clients = await this.oauthClientRepository.getOrganizationOAuthClients(organizationId);
    return { status: SUCCESS_STATUS, data: clients };
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  async getOAuthClientById(@Param("clientId") clientId: string): Promise<ApiResponse<PlatformOAuthClient>> {
    const client = await this.oauthClientRepository.getOAuthClient(clientId);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Put("/:clientId")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  async updateOAuthClient(
    @Param("clientId") clientId: string,
    @Body() body: UpdateOAuthClientInput
  ): Promise<ApiResponse<PlatformOAuthClient>> {
    this.logger.log(`For client ${clientId} updating OAuth Client with data: ${JSON.stringify(body)}`);
    const client = await this.oauthClientRepository.updateOAuthClient(clientId, body);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  async deleteOAuthClient(@Param("clientId") clientId: string): Promise<ApiResponse<PlatformOAuthClient>> {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    const client = await this.oauthClientRepository.deleteOAuthClient(clientId);
    return { status: SUCCESS_STATUS, data: client };
  }
}
