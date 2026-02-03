import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import type { Webhook } from "@calcom/prisma/client";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetWebhook } from "@/modules/webhooks/decorators/get-webhook-decorator";
import { IsTeamEventTypeWebhookGuard } from "@/modules/webhooks/guards/is-team-event-type-webhook-guard";
import { CreateWebhookInputDto, UpdateWebhookInputDto } from "@/modules/webhooks/inputs/webhook.input";
import {
  EventTypeWebhookOutputDto,
  type EventTypeWebhookOutputResponseDto,
  type EventTypeWebhooksOutputResponseDto,
} from "@/modules/webhooks/outputs/event-type-webhook.output";
import type { DeleteManyWebhooksOutputResponseDto } from "@/modules/webhooks/outputs/webhook.output";
import { PartialWebhookInputPipe, WebhookInputPipe } from "@/modules/webhooks/pipes/WebhookInputPipe";
import { WebhookOutputPipe } from "@/modules/webhooks/pipes/WebhookOutputPipe";
import { TeamEventTypeWebhooksService } from "@/modules/webhooks/services/team-event-type-webhooks.service";
import { WebhooksService } from "@/modules/webhooks/services/webhooks.service";

@Controller({
  path: "/v2/teams/:teamId/event-types/:eventTypeId/webhooks",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard, IsTeamEventTypeWebhookGuard)
@DocsTags("Teams / Event Types / Webhooks")
@ApiHeader(API_KEY_HEADER)
export class TeamsEventTypesWebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly teamEventTypeWebhooksService: TeamEventTypeWebhooksService
  ) {}

  @Post("/")
  @ApiOperation({ summary: "Create a webhook for a team event type" })
  @Roles("TEAM_ADMIN")
  async createTeamEventTypeWebhook(
    @Body() body: CreateWebhookInputDto,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<EventTypeWebhookOutputResponseDto> {
    const webhook = await this.teamEventTypeWebhooksService.createTeamEventTypeWebhook(
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
  @ApiOperation({ summary: "Update a webhook for a team event type" })
  @Roles("TEAM_ADMIN")
  async updateTeamEventTypeWebhook(
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
  @ApiOperation({ summary: "Get a webhook for a team event type" })
  @Roles("TEAM_MEMBER")
  async getTeamEventTypeWebhook(@GetWebhook() webhook: Webhook): Promise<EventTypeWebhookOutputResponseDto> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Get("/")
  @Roles("TEAM_MEMBER")
  @ApiOperation({ summary: "Get all webhooks for a team event type" })
  async getTeamEventTypeWebhooks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Query() pagination: SkipTakePagination
  ): Promise<EventTypeWebhooksOutputResponseDto> {
    const webhooks = await this.teamEventTypeWebhooksService.getTeamEventTypeWebhooksPaginated(
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
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Delete a webhook for a team event type" })
  async deleteTeamEventTypeWebhook(
    @GetWebhook() webhook: Webhook
  ): Promise<EventTypeWebhookOutputResponseDto> {
    await this.webhooksService.deleteWebhook(webhook.id);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(EventTypeWebhookOutputDto, new WebhookOutputPipe().transform(webhook), {
        strategy: "excludeAll",
      }),
    };
  }

  @Delete("/")
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Delete all webhooks for a team event type" })
  async deleteAllTeamEventTypeWebhooks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<DeleteManyWebhooksOutputResponseDto> {
    const data = await this.teamEventTypeWebhooksService.deleteAllTeamEventTypeWebhooks(eventTypeId);
    return { status: SUCCESS_STATUS, data: `${data.count} webhooks deleted` };
  }
}
