import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import { IsUserWebhookGuard } from "@/modules/webhooks/guards/is-user-webhook-guard";
import {
  WebhookOutputDto,
  WebhookOutputResponseDto,
  WebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/webhook.output";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import { Controller, Post, Body, UseGuards, Get, Param, Query, Delete, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Webhook } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

import { CreateWebhookInputDto } from "../inputs/create-webhook.input";
import { UserWebhooksService } from "../services/user-webhooks.service";

@Controller({
  path: "/v2/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard)
@ApiTags("Users' Webhooks")
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly userWebhooksService: UserWebhooksService
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Create a webhook" })
  async createWebhook(
    @Body() body: CreateWebhookInputDto,
    @GetUser() user: UserWithProfile
  ): Promise<WebhookOutputResponseDto> {
    const webhook = await this.userWebhooksService.createUserWebhook(user.id, body);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Patch("/:webhookId")
  @ApiOperation({ summary: "Update a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async updateWebhook(
    @Param("webhookId") webhookId: string,
    @Body() body: Partial<CreateWebhookInputDto>
  ): Promise<WebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(webhookId, body);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Get("/:webhookId")
  @ApiOperation({ summary: "Get a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async getWebhook(@GetWebhook() webhook: Webhook): Promise<WebhookOutputResponseDto> {
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all user webhooks paginated" })
  async getWebhooks(
    @GetUser() user: UserWithProfile,
    @Query() query: SkipTakePagination
  ): Promise<WebhooksOutputResponseDto> {
    const webhooks = await this.userWebhooksService.getUserWebhooksPaginated(
      user.id,
      query.skip ?? 0,
      query.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) => plainToClass(WebhookOutputDto, webhook)),
    };
  }

  @Delete("/:webhookId")
  @ApiOperation({ summary: "Delete a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async deleteWebhook(@Param("webhookId") webhookId: string): Promise<WebhookOutputResponseDto> {
    const webhook = await this.webhooksService.deleteWebhook(webhookId);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }
}
