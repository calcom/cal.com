import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { GetMeEventTypesQuery } from "@/ee/me/inputs/get-me-event-types-query.input";
import { GetMeOutput } from "@/ee/me/outputs/get-me.output";
import { UpdateMeOutput } from "@/ee/me/outputs/update-me.output";
import { MeService } from "@/ee/me/services/me.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UsersService } from "@/modules/users/services/users.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Patch, Body, Query } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { EVENT_TYPE_READ, PROFILE_READ, PROFILE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { userSchemaResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/me",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Me")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class MeController {
  constructor(
    private readonly usersService: UsersService,
    private readonly meService: MeService,
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14
  ) {}

  @Get("/")
  @Permissions([PROFILE_READ])
  @ApiOperation({ summary: "Get my profile" })
  async getMe(@GetUser() user: UserWithProfile): Promise<GetMeOutput> {
    const organization = this.usersService.getUserMainProfile(user)?.organization;
    const me = userSchemaResponse.parse(
      organization
        ? {
            ...user,
            organizationId: organization.id,
            organization: {
              id: organization.id,
              isPlatform: organization.isPlatform,
            },
          }
        : user
    );
    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }

  @Patch("/")
  @Permissions([PROFILE_WRITE])
  @ApiOperation({
    summary: "Update my profile",
    description:
      "Updates the authenticated user's profile. Email changes require verification and the primary email stays unchanged until verification completes, unless the new email is already a verified secondary email or the user is platform-managed.",
  })
  async updateMe(
    @GetUser() user: UserWithProfile,
    @Body() updateData: UpdateManagedUserInput
  ): Promise<UpdateMeOutput> {
    const result = await this.meService.updateMe({ user, updateData });

    const me = userSchemaResponse.parse(result.updatedUser);

    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }

  @Get("/event-types")
  @Permissions([EVENT_TYPE_READ])
  @ApiOperation({ summary: "Get my event types" })
  async getMyEventTypes(
    @GetUser("id") userId: number,
    @Query() queryParams: GetMeEventTypesQuery
  ): Promise<GetEventTypesOutput_2024_06_14> {
    const eventTypes = await this.eventTypesService.getUserEventTypes(userId, queryParams.sortCreatedAt);
    const eventTypesFormatted = eventTypes.map((eventType) =>
      this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType, false)
    );

    return {
      status: SUCCESS_STATUS,
      data: eventTypesFormatted,
    };
  }
}
