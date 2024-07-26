import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import {
  WebhookOutputDto,
  WebhookOutputResponseDto,
  WebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/webhook.output";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Query,
  Delete,
  Patch,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { Webhook } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

import { IsUserEventTypeWebhookGuard } from "../guards/is-user-event-type-webhook-guard";
import { CreateWebhookInputDto } from "../inputs/create-webhook.input";

@Controller({
  path: "/v2/webhooks/event-types/:eventTypeId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsUserEventTypeWebhookGuard)
export class EventTypeWebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post("/")
  @ApiOperation({ summary: "Create a webhook for an event-type" })
  async createEventTypeWebhook(
    @Body() body: CreateWebhookInputDto,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<WebhookOutputResponseDto> {
    const webhook = await this.webhooksService.createEventTypeWebhook(eventTypeId, body);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Patch("/:webhookId")
  @ApiOperation({ summary: "Update a webhook of an event-type" })
  async updateWebhook(
    @Body() body: Partial<CreateWebhookInputDto>,
    @Param("webhookId") webhookId: string
  ): Promise<WebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(webhookId, body);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Get("/:webhookId")
  @ApiOperation({ summary: "Get a webhook of an event-type" })
  async getWebhook(@GetWebhook() webhook: Webhook): Promise<WebhookOutputResponseDto> {
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all webhooks of an event-type" })
  async getEventWebhooks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<WebhooksOutputResponseDto> {
    const webhooks = await this.webhooksService.getEventTypeWebhooksPaginated(
      eventTypeId,
      pagination.skip ?? 0,
      pagination.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) => plainToClass(WebhookOutputDto, webhook)),
    };
  }

  @Delete("/:webhookId")
  @ApiOperation({ summary: "Delete a webhook of an event-type" })
  async deleteWebhook(@GetWebhook() webhook: Webhook): Promise<WebhookOutputResponseDto> {
    await this.webhooksService.deleteWebhook(webhook.id);
    return { status: SUCCESS_STATUS, data: plainToClass(WebhookOutputDto, webhook) };
  }
}
