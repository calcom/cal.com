import { EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreatePrivateLinkInput,
  CreatePrivateLinkOutput,
  DeletePrivateLinkOutput,
  GetPrivateLinksOutput,
  UpdatePrivateLinkBody,
  UpdatePrivateLinkOutput,
} from "@calcom/platform-types";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiExcludeController as DocsExcludeController, ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { PrivateLinksService_2024_06_14 } from "@/ee/event-types-private-links/2024-06-14/services/private-links.service";
import {
  VERSION_2024_04_15,
  VERSION_2024_06_11,
  VERSION_2024_06_14,
  VERSION_2024_08_13,
} from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { EventTypeOwnershipGuard } from "@/modules/event-types/guards/event-type-ownership.guard";

@Controller({
  path: "/v2/event-types/:eventTypeId/private-links",
  version: [VERSION_2024_04_15, VERSION_2024_06_11, VERSION_2024_06_14, VERSION_2024_08_13],
})
@UseGuards(PermissionsGuard)
@DocsExcludeController(true)
@DocsTags("Event Types Private Links")
export class EventTypesPrivateLinksController_2024_06_14 {
  constructor(private readonly privateLinksService: PrivateLinksService_2024_06_14) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create a private link for an event type", deprecated: true })
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
  @ApiOperation({ summary: "Get all private links for an event type", deprecated: true })
  async getPrivateLinks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<GetPrivateLinksOutput> {
    const privateLinks = await this.privateLinksService.getPrivateLinks(eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: privateLinks,
    };
  }

  @Patch("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update a private link for an event type", deprecated: true })
  async updatePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @Body() body: UpdatePrivateLinkBody
  ): Promise<UpdatePrivateLinkOutput> {
    const updateInput = { ...body, linkId };
    const privateLink = await this.privateLinksService.updatePrivateLink(eventTypeId, updateInput);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Delete("/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete a private link for an event type", deprecated: true })
  async deletePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string
  ): Promise<DeletePrivateLinkOutput> {
    await this.privateLinksService.deletePrivateLink(eventTypeId, linkId);

    return {
      status: SUCCESS_STATUS,
      data: {
        linkId,
        message: "Private link deleted successfully",
      },
    };
  }
}
