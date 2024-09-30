import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  transformApiEventTypeBookingFields,
  transformApiEventTypeFutureBookingLimits,
  transformApiEventTypeIntervalLimits,
  transformApiEventTypeLocations,
  transformApiEventTypeRecurrence,
} from "@calcom/platform-libraries";
import {
  CreateEventTypeInput_2024_06_14,
  GetEventTypesQuery_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";
import { SchedulingType } from "@calcom/prisma/enums";

import { supabase } from "../../../../config/supabase";
import { VERSION_2024_06_14_VALUE } from "../../../../lib/api-versions";
import { ApiAuthGuard } from "../../../../modules/auth/guards/api-auth/api-auth.guard";
import { CreateEventTypeOutput_2024_06_14 } from "../outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "../outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "../outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "../outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "../outputs/update-event-type.output";

@Controller({
  path: "/v2/event-types",
  version: VERSION_2024_06_14_VALUE,
})
@DocsTags("Event types")
export class EventTypesController_2024_06_14 {
  @Post("/")
  @UseGuards(ApiAuthGuard)
  async createEventType(
    @Body() body: CreateEventTypeInput_2024_06_14
  ): Promise<CreateEventTypeOutput_2024_06_14> {
    const userId = body.userId;
    const scheduleId = body.scheduleId;

    if (!userId) throw new BadRequestException("User ID is required.");
    if (!scheduleId) throw new BadRequestException("Schedule ID is required.");

    const { data: existsWithSlug } = await supabase
      .from("EventType")
      .select("id")
      .eq("slug", body.slug)
      .eq("userId", userId)
      .limit(1)
      .single();

    if (existsWithSlug) throw new BadRequestException("User already has an event type with this slug.");

    const { data: schedule } = await supabase
      .from("Schedule")
      .select("id")
      .eq("id", scheduleId)
      .eq("userId", userId)
      .limit(1)
      .single();

    if (!schedule)
      throw new BadRequestException(`User with ID=${userId} does not own schedule with ID=${scheduleId}`);

    const { eventType } = await this.createEventTypeHandler(body);

    return {
      status: SUCCESS_STATUS,
      data: eventType as CreateEventTypeOutput_2024_06_14["data"],
    };
  }

  @Get("/:eventTypeId")
  @UseGuards(ApiAuthGuard)
  async getEventTypeById(@Param("eventTypeId") eventTypeId: string): Promise<GetEventTypeOutput_2024_06_14> {
    const { data: eventType } = await supabase
      .from("EventType")
      .select("*")
      .eq("id", eventTypeId)
      .limit(1)
      .single();

    if (!eventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: eventType as any,
    };
  }

  @Get("/")
  @UseGuards(ApiAuthGuard)
  async getEventTypes(
    @Query() queryParams: GetEventTypesQuery_2024_06_14
  ): Promise<GetEventTypesOutput_2024_06_14> {
    const { eventSlug, username, usernames } = queryParams;
    let supabaseQuery = supabase.from("EventType").select("*");

    if (!!username) {
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .limit(1)
        .single();

      if (!user)
        return {
          status: SUCCESS_STATUS,
          data: [],
        };
      supabaseQuery = supabaseQuery.eq("userId", user.id);
    }

    if (!!usernames) {
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .in("username", usernames as string[]);

      if (!users)
        return {
          status: SUCCESS_STATUS,
          data: [],
        };

      const userIds = users.map((user) => user.id);

      supabaseQuery = supabaseQuery.in("userId", userIds as string[]);
    }

    if (!!eventSlug) supabaseQuery = supabaseQuery.eq("slug", eventSlug);

    const { data: eventTypes, error } = await supabaseQuery;

    if (error)
      return {
        status: ERROR_STATUS,
        data: null,
      };

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Patch("/:eventTypeId")
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateEventType(
    @Param("eventTypeId") eventTypeId: number,
    @Body() body: UpdateEventTypeInput_2024_06_14
  ): Promise<UpdateEventTypeOutput_2024_06_14> {
    const { data: eventType } = await supabase
      .from("EventType")
      .select("id, slug, title")
      .eq("id", eventTypeId)
      .limit(1)
      .single();

    if (!eventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    const { data: newEventType } = await supabase
      .from("EventType")
      .update(body)
      .eq("id", eventTypeId)
      .select("*");

    return {
      status: SUCCESS_STATUS,
      data: newEventType as any,
    };
  }

  @Delete("/:eventTypeId")
  @UseGuards(ApiAuthGuard)
  async deleteEventType(
    @Param("eventTypeId") eventTypeId: number
  ): Promise<DeleteEventTypeOutput_2024_06_14> {
    const { data: eventType } = await supabase
      .from("EventType")
      .select("id, slug, title, length")
      .eq("id", eventTypeId)
      .limit(1)
      .single();

    if (!eventType) {
      throw new NotFoundException(`Event type with ID=${eventTypeId} does not exist.`);
    }

    await supabase.from("EventType").delete().eq("id", eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: eventType.id,
        lengthInMinutes: eventType.length,
        slug: eventType.slug,
        title: eventType.title,
      },
    };
  }

  async createEventTypeHandler(body: CreateEventTypeInput_2024_06_14): Promise<any> {
    const defaultLocations: CreateEventTypeInput_2024_06_14["locations"] = [
      {
        type: "integration",
        integration: "cal-video",
      },
    ];

    const {
      lengthInMinutes,
      locations,
      bookingFields,
      bookingLimitsCount,
      bookingLimitsDuration,
      bookingWindow,
      recurrence,
      ...rest
    } = body;

    const eventType = {
      ...rest,
      length: lengthInMinutes,
      locations: transformApiEventTypeLocations(locations || defaultLocations),
      bookingFields: transformApiEventTypeBookingFields(bookingFields),
      bookingLimits: bookingLimitsCount ? transformApiEventTypeIntervalLimits(bookingLimitsCount) : undefined,
      durationLimits: bookingLimitsDuration
        ? transformApiEventTypeIntervalLimits(bookingLimitsDuration)
        : undefined,
      ...transformApiEventTypeFutureBookingLimits(bookingWindow),
      recurringEvent: recurrence ? transformApiEventTypeRecurrence(recurrence) : undefined,
    };

    const {
      userId,
      schedulingType,
      teamId,
      metadata,
      locations: inputLocations,
      scheduleId,
      ...dataRest
    } = eventType;

    const { data: user } = await supabase.from("users").select("*").eq("id", userId).limit(1).single();

    const isManagedEventType = schedulingType === SchedulingType.MANAGED;

    const data = dataRest as any;

    const formattedDataWithOwner = teamId ? data : { ...data, owner: userId };
    const formattedDataWithMetadata = metadata
      ? { ...formattedDataWithOwner, metadata }
      : formattedDataWithOwner;
    // Only connecting the current user for non-managed event types and non team event types
    const formattedDataWithUserId =
      isManagedEventType || schedulingType
        ? formattedDataWithMetadata
        : { ...formattedDataWithMetadata, userId };
    const formattedDataWithLocations =
      inputLocations && inputLocations.length !== 0
        ? { ...formattedDataWithUserId, locations: inputLocations }
        : formattedDataWithUserId;
    const formattedDataWithScheduleId = scheduleId
      ? { ...formattedDataWithLocations, scheduleId }
      : formattedDataWithLocations;

    if (teamId && schedulingType) {
      const { data: hasMembership } = await supabase
        .from("Membership")
        .select("role")
        .eq("userId", userId)
        .eq("teamId", teamId)
        .eq("accepted", true)
        .limit(1)
        .single();

      const isSystemAdmin = user.role === "ADMIN";

      if (!isSystemAdmin && (!hasMembership?.role || !["ADMIN", "OWNER"].includes(hasMembership.role))) {
        console.warn(`User ${userId} does not have permission to create this new event type`);
        throw new BadRequestException("UNAUTHORIZED");
      }

      data.teamId = teamId;
      data.schedulingType = schedulingType;
    }

    // If we are in an organization & they are not admin & they are not creating an event on a teamID
    // Check if evenTypes are locked.
    if (user.organizationId && !user?.organization?.isOrgAdmin && !teamId) {
      const { data: orgSettings } = await supabase
        .from("OrganizationSettings")
        .select("lockEventTypeCreationForUsers")
        .eq("organizationId", user.organizationId)
        .limit(1)
        .single();

      const orgHasLockedEventTypes = !!orgSettings?.lockEventTypeCreationForUsers;
      if (orgHasLockedEventTypes) {
        console.warn(
          `User ${userId} does not have permission to create this new event type - Locked status: ${orgHasLockedEventTypes}`
        );
        throw new BadRequestException({ code: "UNAUTHORIZED" });
      }
    }

    const profileId = user.movedToProfileId;

    try {
      const { data: eventType } = await supabase
        .from("EventType")
        .insert({ ...formattedDataWithScheduleId, profileId })
        .select("*")
        .single();

      return { eventType };
    } catch (e) {
      console.warn(e);
      throw new BadRequestException({ code: "BAD_REQUEST" });
    }
  }
}
