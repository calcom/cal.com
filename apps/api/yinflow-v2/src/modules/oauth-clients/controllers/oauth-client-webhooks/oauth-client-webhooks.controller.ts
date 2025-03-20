import { Controller, Post, Body, UseGuards, Get, Param, Query, Delete, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { Webhook, MembershipRole } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

import { API_VERSIONS_VALUES } from "../../../../lib/api-versions";
import { MembershipRoles } from "../../../auth/decorators/roles/membership-roles.decorator";
import { NextAuthGuard } from "../../../auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "../../../auth/guards/organization-roles/organization-roles.guard";
import { GetWebhook } from "../../../webhooks/decorators/get-webhook-decorator";
import { IsOAuthClientWebhookGuard } from "../../../webhooks/guards/is-oauth-client-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "../../../webhooks/inputs/webhook.input";
import {
  OAuthClientWebhookOutputResponseDto,
  OAuthClientWebhookOutputDto,
  OAuthClientWebhooksOutputResponseDto,
} from "../../../webhooks/outputs/oauth-client-webhook.output";
import { DeleteManyWebhooksOutputResponseDto } from "../../../webhooks/outputs/webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "../../../webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "../../../webhooks/pipes/WebhookOutputPipe";
import { OAuthClientWebhooksService } from "../../../webhooks/services/oauth-clients-webhooks.service";
import { WebhooksService } from "../../../webhooks/services/webhooks.service";
import { OAuthClientGuard } from "../../guards/oauth-client-guard";

@Controller({
  path: "/v2/oauth-clients/:clientId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(NextAuthGuard, OrganizationRolesGuard, OAuthClientGuard)
@DocsTags("Platform / Webhooks")
export class OAuthClientWebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly oAuthClientWebhooksService: OAuthClientWebhooksService
  ) {}

  @Post("/")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({ summary: "Create a webhook" })
  async createOAuthClientWebhook(
    @Body() body: CreateWebhookInputDto,
    @Param("clientId") oAuthClientId: string
  ): Promise<OAuthClientWebhookOutputResponseDto> {
    const webhook = await this.oAuthClientWebhooksService.createOAuthClientWebhook(
      oAuthClientId,
      new WebhookInputPipe().transform(body)
    );

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Patch("/:webhookId")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({ summary: "Update a webhook" })
  @UseGuards(IsOAuthClientWebhookGuard)
  async updateOAuthClientWebhook(
    @Body() body: UpdateWebhookInputDto,
    @Param("webhookId") webhookId: string
  ): Promise<OAuthClientWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(
      webhookId,
      new PartialWebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/:webhookId")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @ApiOperation({ summary: "Get a webhook" })
  @UseGuards(IsOAuthClientWebhookGuard)
  async getOAuthClientWebhook(@GetWebhook() webhook: Webhook): Promise<OAuthClientWebhookOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @ApiOperation({ summary: "Get all webhooks" })
  async getOAuthClientWebhooks(
    @Param("clientId") oAuthClientId: string,
    @Query() pagination: SkipTakePagination
  ): Promise<OAuthClientWebhooksOutputResponseDto> {
    const webhooks = await this.oAuthClientWebhooksService.getOAuthClientWebhooksPaginated(
      oAuthClientId,
      pagination.skip ?? 0,
      pagination.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook: any) =>
        plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Delete("/:webhookId")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({ summary: "Delete a webhook" })
  @UseGuards(IsOAuthClientWebhookGuard)
  async deleteOAuthClientWebhook(
    @GetWebhook() webhook: Webhook
  ): Promise<OAuthClientWebhookOutputResponseDto> {
    await this.webhooksService.deleteWebhook(webhook.id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Delete("/")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({ summary: "Delete all webhooks" })
  async deleteAllOAuthClientWebhooks(
    @Param("clientId") oAuthClientId: string
  ): Promise<DeleteManyWebhooksOutputResponseDto> {
    const data = await this.oAuthClientWebhooksService.deleteAllOAuthClientWebhooks(oAuthClientId);
    return { status: SUCCESS_STATUS, data: `${data.count} webhooks deleted` };
  }
}
