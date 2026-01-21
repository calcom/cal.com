import { SUCCESS_STATUS, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { MembershipRole } from "@calcom/platform-libraries";
import { SkipTakePagination } from "@calcom/platform-types";
import type { Webhook } from "@calcom/prisma/client";
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import { IsOAuthClientWebhookGuard } from "@/modules/webhooks/guards/is-oauth-client-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  OAuthClientWebhookOutputDto,
  OAuthClientWebhookOutputResponseDto,
  OAuthClientWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/oauth-client-webhook.output";
import { DeleteManyWebhooksOutputResponseDto } from "@/modules/webhooks/outputs/webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { OAuthClientWebhooksService } from "@/modules/webhooks/services/oauth-clients-webhooks.service";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";

import { OAuthClientGuard } from "../../guards/oauth-client-guard";

@Controller({
  path: "/v2/oauth-clients/:clientId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, OrganizationRolesGuard, OAuthClientGuard)
@DocsTags("Deprecated: Platform / Webhooks")
@ApiHeader({
  name: X_CAL_SECRET_KEY,
  description: "OAuth client secret key",
  required: true,
})
export class OAuthClientWebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly oAuthClientWebhooksService: OAuthClientWebhooksService
  ) {}

  @Post("/")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({
    summary: "Create a webhook",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
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
  @ApiOperation({
    summary: "Update a webhook",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
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
  @ApiOperation({
    summary: "Get a webhook",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
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
  @ApiOperation({
    summary: "Get all webhooks",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
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
      data: webhooks.map((webhook) =>
        plainToClass(OAuthClientWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Delete("/:webhookId")
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @ApiOperation({
    summary: "Delete a webhook",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
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
  @ApiOperation({
    summary: "Delete all webhooks",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  async deleteAllOAuthClientWebhooks(
    @Param("clientId") oAuthClientId: string
  ): Promise<DeleteManyWebhooksOutputResponseDto> {
    const data = await this.oAuthClientWebhooksService.deleteAllOAuthClientWebhooks(oAuthClientId);
    return { status: SUCCESS_STATUS, data: `${data.count} webhooks deleted` };
  }
}
