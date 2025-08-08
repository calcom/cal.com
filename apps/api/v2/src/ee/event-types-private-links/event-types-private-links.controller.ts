import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
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
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import {
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  SUCCESS_STATUS,
} from "@calcom/platform-constants";
import {
  CreatePrivateLinkInput_2024_06_14,
  CreatePrivateLinkOutput_2024_06_14,
  DeletePrivateLinkOutput_2024_06_14,
  GetPrivateLinksOutput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

import { PrivateLinksService } from "./services/private-links.service";

@Controller({
  path: "/v2/event-types/:eventTypeId/private-links",
})
@UseGuards(PermissionsGuard)
@DocsTags("Event Types Private Links")
export class EventTypesPrivateLinksController {
  constructor(private readonly privateLinksService: PrivateLinksService) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create a private link for an event type" })
  async createPrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: CreatePrivateLinkInput_2024_06_14,
    @GetUser("id") userId: number
  ): Promise<CreatePrivateLinkOutput_2024_06_14> {
    const privateLink = await this.privateLinksService.createPrivateLink(eventTypeId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Get("/")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all private links for an event type" })
  async getPrivateLinks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @GetUser("id") userId: number
  ): Promise<GetPrivateLinksOutput_2024_06_14> {
    const privateLinks = await this.privateLinksService.getPrivateLinks(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: privateLinks,
    };
  }

  @Patch("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update a private link for an event type" })
  async updatePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @Body() body: Omit<UpdatePrivateLinkInput_2024_06_14, "linkId">,
    @GetUser("id") userId: number
  ): Promise<UpdatePrivateLinkOutput_2024_06_14> {
    const updateInput = { ...body, linkId };
    const privateLink = await this.privateLinksService.updatePrivateLink(eventTypeId, userId, updateInput);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Delete("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete a private link for an event type" })
  async deletePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @GetUser("id") userId: number
  ): Promise<DeletePrivateLinkOutput_2024_06_14> {
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


