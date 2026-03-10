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
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { PrivateLinksService_2024_09_04 } from "@/ee/event-types-private-links/2024-09-04/services/private-links.service";
import { VERSION_2024_09_04 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { OAuthPermissions } from "@/modules/auth/decorators/oauth-permissions/oauth-permissions.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { EventTypeOwnershipGuard } from "@/modules/event-types/guards/event-type-ownership.guard";

@Controller({
  path: "/v2/event-types/:eventTypeId/private-links",
  version: VERSION_2024_09_04,
})
@UseGuards(PermissionsGuard)
@DocsTags("Event Types Private Links")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to \`2024-09-04\`. Returns the full booking URL including org slug and event slug.`,
  example: "2024-09-04",
  required: true,
  schema: {
    default: "2024-09-04",
  },
})
export class EventTypesPrivateLinksController_2024_09_04 {
  constructor(private readonly privateLinksService: PrivateLinksService_2024_09_04) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @OAuthPermissions(["EVENT_TYPE_WRITE"])
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
  @OAuthPermissions(["EVENT_TYPE_READ"])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all private links for an event type" })
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
  @OAuthPermissions(["EVENT_TYPE_WRITE"])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update a private link for an event type" })
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
  @OAuthPermissions(["EVENT_TYPE_WRITE"])
  @UseGuards(ApiAuthGuard, EventTypeOwnershipGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete a private link for an event type" })
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
