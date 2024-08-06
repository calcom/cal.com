import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import { IsUserEventTypeWebhookGuard } from "@/modules/webhooks/guards/is-user-event-type-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  EventTypeWebhookOutputResponseDto,
  EventTypeWebhookOutputDto,
  EventTypeWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/event-type-webhook.output";
import { DeleteManyWebhooksOutputResponseDto } from "@/modules/webhooks/outputs/webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { EventTypeWebhooksService } from "@/modules/webhooks/services/event-type-webhooks.service";
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
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Webhook } from "@prisma/client";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/event-types/:eventTypeId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsUserEventTypeWebhookGuard)
@ApiTags("Users' EventTypes Webhooks")
export class EventTypeWebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly eventTypeWebhooksService: EventTypeWebhooksService
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Create a webhook for an event-type" })
  async createEventTypeWebhook(
    @Body() body: CreateWebhookInputDto,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<EventTypeWebhookOutputResponseDto> {
    const webhook = await this.eventTypeWebhooksService.createEventTypeWebhook(
      eventTypeId,
      new WebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Patch("/:webhookId")
  @ApiOperation({ summary: "Update a webhook of an event-type" })
  async updateEventTypeWebhook(
    @Body() body: UpdateWebhookInputDto,
    @Param("webhookId") webhookId: string
  ): Promise<EventTypeWebhookOutputResponseDto> {
    const webhook = await this.webhooksService.updateWebhook(
      webhookId,
      new PartialWebhookInputPipe().transform(body)
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/:webhookId")
  @ApiOperation({ summary: "Get a webhook of an event-type" })
  async getEventTypeWebhook(@GetWebhook() webhook: Webhook): Promise<EventTypeWebhookOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all webhooks of an event-type" })
  async getEventTypeWebhooks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<EventTypeWebhooksOutputResponseDto> {
    const webhooks = await this.eventTypeWebhooksService.getEventTypeWebhooksPaginated(
      eventTypeId,
      pagination.skip ?? 0,
      pagination.take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: webhooks.map((webhook) =>
        plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
          strategy: "excludeAll",
        })
      ),
    };
  }

  @Delete("/:webhookId")
  @ApiOperation({ summary: "Delete a webhook of an event-type" })
  async deleteEventTypeWebhook(@GetWebhook() webhook: Webhook): Promise<EventTypeWebhookOutputResponseDto> {
    await this.webhooksService.deleteWebhook(webhook.id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Delete("/")
  @ApiOperation({ summary: "Delete all webhooks of an event-type" })
  async deleteAllEventTypeWebhooks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<DeleteManyWebhooksOutputResponseDto> {
    const data = await this.eventTypeWebhooksService.deleteAllEventTypeWebhooks(eventTypeId);
    return { status: SUCCESS_STATUS, data: `${data.count} webhooks deleted` };
  }
}
