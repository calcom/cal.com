import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { EventTypeOwnershipGuard } from "@/modules/event-types/guards/event-type-ownership.guard";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags, OmitType } from "@nestjs/swagger";

import {
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import {
  CreatePrivateLinkInput,
  CreatePrivateLinkOutput,
  DeletePrivateLinkOutput,
  GetPrivateLinksOutput,
  UpdatePrivateLinkInput,
  UpdatePrivateLinkOutput,
} from "@calcom/platform-types";

import { PrivateLinksService } from "../services/private-links.service";

class UpdatePrivateLinkBody extends OmitType(UpdatePrivateLinkInput, ["linkId"] as const) {}

@Controller({
  path: "/v2/event-types/:eventTypeId/private-links",
})
@UseGuards(PermissionsGuard)
@DocsTags("Event Types Private Links")
export class EventTypesPrivateLinksController {
  constructor(private readonly privateLinksService: PrivateLinksService) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create a private link for an event type" })
  async createPrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: CreatePrivateLinkInput,
    @GetUser("id") userId: number
  ): Promise<CreatePrivateLinkOutput> {
    const privateLink = await this.privateLinksService.createPrivateLink(eventTypeId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Get("/")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all private links for an event type" })
  async getPrivateLinks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @GetUser("id") userId: number
  ): Promise<GetPrivateLinksOutput> {
    const privateLinks = await this.privateLinksService.getPrivateLinks(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: privateLinks,
    };
  }

  @Patch("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update a private link for an event type" })
  async updatePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @Body() body: UpdatePrivateLinkBody,
    @GetUser("id") userId: number
  ): Promise<UpdatePrivateLinkOutput> {
    const updateInput = { ...body, linkId };
    const privateLink = await this.privateLinksService.updatePrivateLink(eventTypeId, userId, updateInput);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Delete("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete a private link for an event type" })
  async deletePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @GetUser("id") userId: number
  ): Promise<DeletePrivateLinkOutput> {
    await this.privateLinksService.deletePrivateLink(eventTypeId, userId, linkId);

    return {
      status: SUCCESS_STATUS,
      data: {
        linkId,
        message: "Private link deleted successfully",
      },
    };
  }
}


