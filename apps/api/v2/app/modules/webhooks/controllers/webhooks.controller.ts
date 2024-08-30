import { Controller, Post, Body, UseGuards, Get, Param, Query, Delete, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Webhook } from "@prisma/client";
import { API_VERSIONS_VALUES } from "app/lib/api-versions";
import { GetUser } from "app/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "app/modules/auth/guards/api-auth/api-auth.guard";
import { UserWithProfile } from "app/modules/users/users.repository";
import { GetWebhook } from "app/modules/webhooks/decorators/get-webhook-decorator";
import { IsUserWebhookGuard } from "app/modules/webhooks/guards/is-user-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "app/modules/webhooks/inputs/webhook.input";
import {
  UserWebhookOutputDto,
  UserWebhookOutputResponseDto,
  UserWebhooksOutputResponseDto,
} from "app/modules/webhooks/outputs/user-webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "app/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "app/modules/webhooks/pipes/WebhookOutputPipe";
import { UserWebhooksService } from "app/modules/webhooks/services/user-webhooks.service";
import { WebhooksService } from "app/modules/webhooks/services/webhooks.service";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

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
  ): Promise<UserWebhookOutputResponseDto> {
    const webhook = await this.userWebhooksService.createUserWebhook(
      user.id,
      new WebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Patch("/:webhookId")
  @ApiOperation({ summary: "Update a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async updateWebhook(
    @Param("webhookId") webhookId: string,
    @Body() body: UpdateWebhookInputDto
  ): Promise<UserWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(
      webhookId,
      new PartialWebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/:webhookId")
  @ApiOperation({ summary: "Get a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async getWebhook(@GetWebhook() webhook: Webhook): Promise<UserWebhookOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserWebhookOutputDto, new WebhookOutputPipe().transform(webhook)),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all user webhooks paginated" })
  async getWebhooks(
    @GetUser() user: UserWithProfile,
    @Query() query: SkipTakePagination
  ): Promise<UserWebhooksOutputResponseDto> {
    const webhooks = await this.userWebhooksService.getUserWebhooksPaginated(
      user.id,
      query.skip ?? 0,
      query.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) =>
        plainToClass(UserWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Delete("/:webhookId")
  @ApiOperation({ summary: "Delete a webhook" })
  @UseGuards(IsUserWebhookGuard)
  async deleteWebhook(@Param("webhookId") webhookId: string): Promise<UserWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.deleteWebhook(webhookId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(UserWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }
}
