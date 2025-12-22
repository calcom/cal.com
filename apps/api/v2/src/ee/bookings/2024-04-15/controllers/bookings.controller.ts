import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";
import { CreateRecurringBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-recurring-booking.input";
import { MarkNoShowInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/mark-no-show.input";
import { GetBookingOutput_2024_04_15 } from "@/ee/bookings/2024-04-15/outputs/get-booking.output";
import { GetBookingsOutput_2024_04_15 } from "@/ee/bookings/2024-04-15/outputs/get-bookings.output";
import { MarkNoShowOutput_2024_04_15 } from "@/ee/bookings/2024-04-15/outputs/mark-no-show.output";
import { PlatformBookingsService } from "@/ee/bookings/shared/platform-bookings.service";
import { sha256Hash, isApiKey, stripApiKey } from "@/lib/api-key";
import { VERSION_2024_04_15, VERSION_2024_06_11, VERSION_2024_06_14 } from "@/lib/api-versions";
import { PrismaEventTypeRepository } from "@/lib/repositories/prisma-event-type.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import { InstantBookingCreateService } from "@/lib/services/instant-booking-create.service";
import { RecurringBookingService } from "@/lib/services/recurring-booking.service";
import { RegularBookingService } from "@/lib/services/regular-booking.service";
import { ApiKeysRepository } from "@/modules/api-keys/api-keys-repository";
import {
  AuthOptionalUser,
  GetOptionalUser,
} from "@/modules/auth/decorators/get-optional-user/get-optional-user.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OptionalApiAuthGuard } from "@/modules/auth/guards/optional-api-auth/optional-api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { BillingService } from "@/modules/billing/services/billing.service";
import { KyselyReadService } from "@/modules/kysely/kysely-read.service";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { UsersService } from "@/modules/users/services/users.service";
import { UsersRepository, UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Post,
  Logger,
  Req,
  InternalServerErrorException,
  Body,
  Headers,
  HttpException,
  Param,
  Get,
  Query,
  NotFoundException,
  UseGuards,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiQuery, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Request } from "express";
import { NextApiRequest } from "next/types";
import { v4 as uuidv4 } from "uuid";

import { X_CAL_CLIENT_ID, X_CAL_PLATFORM_EMBED } from "@calcom/platform-constants";
import { BOOKING_READ, SUCCESS_STATUS, BOOKING_WRITE } from "@calcom/platform-constants";
import {
  BookingResponse,
  HttpError,
  handleMarkNoShow,
  getAllUserBookings,
  getBookingInfo,
  handleCancelBooking,
  getBookingForReschedule,
  ErrorCode,
} from "@calcom/platform-libraries";
import { CreationSource } from "@calcom/platform-libraries";
import { type InstantBookingCreateResult } from "@calcom/platform-libraries/bookings";
import {
  GetBookingsInput_2024_04_15,
  CancelBookingInput_2024_04_15,
  Status_2024_04_15,
} from "@calcom/platform-types";
import type { ApiResponse } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";

type BookingRequest = Request & {
  userId?: number;
};

type OAuthRequestParams = {
  platformClientId: string;
  platformRescheduleUrl: string;
  platformCancelUrl: string;
  platformBookingUrl: string;
  platformBookingLocation?: string;
  arePlatformEmailsEnabled: boolean;
  areCalendarEventsEnabled: boolean;
};

const DEFAULT_PLATFORM_PARAMS = {
  platformClientId: "",
  platformCancelUrl: "",
  platformRescheduleUrl: "",
  platformBookingUrl: "",
  arePlatformEmailsEnabled: false,
  platformBookingLocation: undefined,
  areCalendarEventsEnabled: false,
};

@Controller({
  path: "/v2/bookings",
  version: [VERSION_2024_04_15, VERSION_2024_06_11, VERSION_2024_06_14],
})
@UseGuards(PermissionsGuard)
@DocsExcludeController(true)
export class BookingsController_2024_04_15 {
  private readonly logger = new Logger("BookingsController_2024_04_15");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly prismaReadService: PrismaReadService,
    private readonly kyselyReadService: KyselyReadService,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly billingService: BillingService,
    private readonly config: ConfigService,
    private readonly apiKeyRepository: ApiKeysRepository,
    private readonly platformBookingsService: PlatformBookingsService,
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly regularBookingService: RegularBookingService,
    private readonly recurringBookingService: RecurringBookingService,
    private readonly instantBookingCreateService: InstantBookingCreateService,
    private readonly eventTypeRepository: PrismaEventTypeRepository,
    private readonly teamRepository: PrismaTeamRepository
  ) { }

  @Get("/")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_READ])
  @ApiQuery({ name: "filters[status]", enum: Status_2024_04_15, required: true })
  @ApiQuery({ name: "limit", type: "number", required: false })
  @ApiQuery({ name: "cursor", type: "number", required: false })
  async getBookings(
    @GetUser() user: UserWithProfile,
    @Query() queryParams: GetBookingsInput_2024_04_15
  ): Promise<GetBookingsOutput_2024_04_15> {
    const { filters, cursor, limit } = queryParams;
    const bookingListingByStatus = filters?.status ?? Status_2024_04_15["upcoming"];
    const profile = this.usersService.getUserMainProfile(user);
    const bookings = await getAllUserBookings({
      bookingListingByStatus: [bookingListingByStatus],
      skip: cursor ?? 0,
      take: limit ?? 10,
      filters,
      ctx: {
        user: { email: user.email, id: user.id, orgId: profile?.organizationId },
        prisma: this.prismaReadService.prisma as unknown as PrismaClient,
        kysely: this.kyselyReadService.kysely,
      },
    });

    let nextCursor = null;
    if (bookings.totalCount > (cursor ?? 0) + (limit ?? 10)) {
      nextCursor = (cursor ?? 0) + (limit ?? 10);
    }
    return {
      status: SUCCESS_STATUS,
      data: { ...bookings, nextCursor },
    };
  }

  @Get("/:bookingUid")
  async getBooking(@Param("bookingUid") bookingUid: string): Promise<GetBookingOutput_2024_04_15> {
    const { bookingInfo } = await getBookingInfo(bookingUid);

    if (!bookingInfo) {
      throw new NotFoundException(`Booking with UID=${bookingUid} does not exist.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: bookingInfo,
    };
  }

  @Get("/:bookingUid/reschedule")
  @UseGuards(OptionalApiAuthGuard)
  async getBookingForReschedule(
    @Param("bookingUid") bookingUid: string,
    @GetOptionalUser() user: AuthOptionalUser
  ): Promise<ApiResponse<unknown>> {
    const booking = await getBookingForReschedule(bookingUid, user?.id);

    if (!booking) {
      throw new NotFoundException(`Booking with UID=${bookingUid} does not exist.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: booking,
    };
  }

  @Post("/")
  async createBooking(
    @Req() req: BookingRequest,
    @Body() body: CreateBookingInput_2024_04_15,
    @Headers(X_CAL_CLIENT_ID) clientId?: string,
    @Headers(X_CAL_PLATFORM_EMBED) isEmbed?: string
  ): Promise<ApiResponse<Partial<BookingResponse>>> {
    const oAuthClientId =
      clientId?.toString() || (await this.getOAuthClientIdFromEventType(body.eventTypeId));
    const { orgSlug, locationUrl } = body;
    try {
      await this.checkBookingRequiresAuthentication(req, body.eventTypeId, body.rescheduleUid);

      const bookingRequest = await this.createNextApiBookingRequest(req, oAuthClientId, locationUrl, isEmbed);
      const booking = await this.regularBookingService.createBooking({
        bookingData: bookingRequest.body,
        bookingMeta: {
          userId: bookingRequest.userId,
          hostname: bookingRequest.headers?.host || "",
          forcedSlug: orgSlug,
          platformClientId: bookingRequest.platformClientId,
          platformRescheduleUrl: bookingRequest.platformRescheduleUrl,
          platformCancelUrl: bookingRequest.platformCancelUrl,
          platformBookingUrl: bookingRequest.platformBookingUrl,
          platformBookingLocation: bookingRequest.platformBookingLocation,
          areCalendarEventsEnabled: bookingRequest.areCalendarEventsEnabled,
        },
      });
      if (booking.userId && booking.uid && booking.startTime) {
        void (await this.billingService.increaseUsageByUserId(booking.userId, {
          uid: booking.uid,
          startTime: booking.startTime,
          fromReschedule: booking.fromReschedule,
        }));
      }
      return {
        status: SUCCESS_STATUS,
        data: booking,
      };
    } catch (err) {
      this.handleBookingErrors(err);
    }
    throw new InternalServerErrorException("Could not create booking.");
  }

  @Post("/:bookingUid/cancel")
  async cancelBooking(
    @Req() req: BookingRequest,
    @Param("bookingUid") bookingUid: string,
    @Body() body: CancelBookingInput_2024_04_15,
    @Headers(X_CAL_CLIENT_ID) clientId?: string,
    @Headers(X_CAL_PLATFORM_EMBED) isEmbed?: string
  ): Promise<ApiResponse<{ bookingId: number; bookingUid: string; onlyRemovedAttendee: boolean }>> {
    const oAuthClientId = clientId?.toString();
    const isUidNumber = !isNaN(Number(bookingUid));

    if (isUidNumber) {
      throw new BadRequestException("Please provide booking uid instead of booking id.");
    }

    if (bookingUid) {
      const { bookingInfo } = await getBookingInfo(bookingUid);
      if (!bookingInfo) {
        throw new NotFoundException(`Booking with UID=${bookingUid} does not exist.`);
      }
      if (bookingInfo.status === "CANCELLED") {
        throw new BadRequestException(
          `Can't cancel booking with uid=${bookingUid} because it has been cancelled already. Please provide uid of a booking that is not cancelled.`
        );
      }
      try {
        req.body.uid = bookingUid;
        const bookingRequest = await this.createNextApiBookingRequest(req, oAuthClientId, undefined, isEmbed);
        const res = await handleCancelBooking({
          bookingData: bookingRequest.body,
          userId: bookingRequest.userId,
          userUuid: bookingRequest.userUuid,
          arePlatformEmailsEnabled: bookingRequest.arePlatformEmailsEnabled,
          platformClientId: bookingRequest.platformClientId,
          platformCancelUrl: bookingRequest.platformCancelUrl,
          platformRescheduleUrl: bookingRequest.platformRescheduleUrl,
          platformBookingUrl: bookingRequest.platformBookingUrl,
        });
        if (!res.onlyRemovedAttendee) {
          void (await this.billingService.cancelUsageByBookingUid(res.bookingUid));
        }
        return {
          status: SUCCESS_STATUS,
          data: {
            bookingId: res.bookingId,
            bookingUid: res.bookingUid,
            onlyRemovedAttendee: res.onlyRemovedAttendee,
          },
        };
      } catch (err) {
        this.handleBookingErrors(err);
      }
    } else {
      throw new NotFoundException("Booking ID is required.");
    }
    throw new InternalServerErrorException("Could not cancel booking.");
  }

  @Post("/:bookingUid/mark-no-show")
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard)
  async markNoShow(
    @GetUser() user: UserWithProfile,
    @Body() body: MarkNoShowInput_2024_04_15,
    @Param("bookingUid") bookingUid: string
  ): Promise<MarkNoShowOutput_2024_04_15> {
    try {
      const markNoShowResponse = await handleMarkNoShow({
        bookingUid: bookingUid,
        attendees: body.attendees,
        noShowHost: body.noShowHost,
        userId: user.id,
        userUuid: user.uuid,
      });

      return { status: SUCCESS_STATUS, data: markNoShowResponse };
    } catch (err) {
      this.handleBookingErrors(err, "no-show");
    }
    throw new InternalServerErrorException("Could not mark no show.");
  }

  @Post("/recurring")
  async createRecurringBooking(
    @Req() req: BookingRequest,
    @Body() body: CreateRecurringBookingInput_2024_04_15[],
    @Headers(X_CAL_CLIENT_ID) clientId?: string,
    @Headers(X_CAL_PLATFORM_EMBED) isEmbed?: string
  ): Promise<ApiResponse<BookingResponse[]>> {
    const oAuthClientId =
      clientId?.toString() || (await this.getOAuthClientIdFromEventType(body[0]?.eventTypeId));
    try {
      const recurringEventId = uuidv4();
      for (const recurringEvent of req.body) {
        if (!recurringEvent.recurringEventId) {
          recurringEvent.recurringEventId = recurringEventId;
        }
      }
      const bookingRequest = await this.createNextApiBookingRequest(req, oAuthClientId, undefined, isEmbed);
      const createdBookings: BookingResponse[] = await this.recurringBookingService.createBooking({
        bookingData: body.map((booking) => ({ ...booking, creationSource: CreationSource.API_V2 })),
        bookingMeta: {
          userId: bookingRequest.userId,
          hostname: bookingRequest.headers?.host || "",
          platformClientId: bookingRequest.platformClientId,
          platformRescheduleUrl: bookingRequest.platformRescheduleUrl,
          platformCancelUrl: bookingRequest.platformCancelUrl,
          platformBookingUrl: bookingRequest.platformBookingUrl,
          platformBookingLocation: bookingRequest.platformBookingLocation,
          noEmail: bookingRequest.body.noEmail,
        },
      });

      createdBookings.forEach(async (booking) => {
        if (booking.userId && booking.uid && booking.startTime) {
          void (await this.billingService.increaseUsageByUserId(booking.userId, {
            uid: booking.uid,
            startTime: booking.startTime,
          }));
        }
      });

      return {
        status: SUCCESS_STATUS,
        data: createdBookings,
      };
    } catch (err) {
      this.handleBookingErrors(err, "recurring");
    }
    throw new InternalServerErrorException("Could not create recurring booking.");
  }

  @Post("/instant")
  async createInstantBooking(
    @Req() req: BookingRequest,
    @Body() body: CreateBookingInput_2024_04_15,
    @Headers(X_CAL_CLIENT_ID) clientId?: string,
    @Headers(X_CAL_PLATFORM_EMBED) isEmbed?: string
  ): Promise<ApiResponse<InstantBookingCreateResult>> {
    const oAuthClientId =
      clientId?.toString() || (await this.getOAuthClientIdFromEventType(body.eventTypeId));
    req.userId = (await this.getOwner(req))?.id ?? -1;
    try {
      const bookingReq = await this.createNextApiBookingRequest(req, oAuthClientId, undefined, isEmbed);
      const instantMeeting = await this.instantBookingCreateService.createBooking({
        bookingData: bookingReq.body,
      });

      if (instantMeeting.userId && instantMeeting.bookingUid) {
        const now = new Date();
        // add a 10 secondes delay to the usage incrementation to give some time to cancel the booking if needed
        now.setSeconds(now.getSeconds() + 10);
        void (await this.billingService.increaseUsageByUserId(instantMeeting.userId, {
          uid: instantMeeting.bookingUid,
          startTime: now,
        }));
      }

      return {
        status: SUCCESS_STATUS,
        data: instantMeeting,
      };
    } catch (err) {
      this.handleBookingErrors(err, "instant");
    }
    throw new InternalServerErrorException("Could not create instant booking.");
  }

  private async getOwner(req: Request): Promise<{ id: number; uuid: string } | null> {
    try {
      const bearerToken = req.get("Authorization")?.replace("Bearer ", "");
      if (!bearerToken) {
        return null;
      }

      let ownerId: number | null = null;

      if (isApiKey(bearerToken, this.config.get<string>("api.apiKeyPrefix") ?? "cal_")) {
        const strippedApiKey = stripApiKey(bearerToken, this.config.get<string>("api.keyPrefix"));
        const apiKeyHash = sha256Hash(strippedApiKey);
        const keyData = await this.apiKeyRepository.getApiKeyFromHash(apiKeyHash);
        ownerId = keyData?.userId ?? null;
      } else {
        // Access Token
        ownerId = await this.oAuthFlowService.getOwnerId(bearerToken);
      }

      if (!ownerId) {
        return null;
      }

      const user = await this.usersRepository.findById(ownerId);
      if (!user) {
        return null;
      }

      return { id: user.id, uuid: user.uuid };
    } catch (err) {
      this.logger.error(err);
      return null;
    }
  }

  private async getOwnerRescheduledBooking(
    request: Request,
    platformClientId?: string
  ): Promise<{ id: number; uuid: string } | null> {
    if (
      platformClientId &&
      request.body.rescheduledBy &&
      !request.body.rescheduledBy.includes(platformClientId)
    ) {
      request.body.rescheduledBy = OAuthClientUsersService.getOAuthUserEmail(
        platformClientId,
        request.body.rescheduledBy
      );
    }

    if (request.body.rescheduledBy && request.body.rescheduledBy !== request.body.responses.email) {
      const user = await this.usersRepository.findByEmail(request.body.rescheduledBy);
      if (!user) {
        return null;
      }
      return { id: user.id, uuid: user.uuid };
    }

    return null;
  }

  private async getOAuthClientIdFromEventType(eventTypeId: number): Promise<string | undefined> {
    if (!eventTypeId) {
      return undefined;
    }
    const oAuthClientParams = await this.platformBookingsService.getOAuthClientParams(eventTypeId);
    if (!oAuthClientParams) {
      return undefined;
    }
    return oAuthClientParams.platformClientId;
  }

  private async isValidRescheduleBooking(rescheduleUid: string, eventTypeId: number): Promise<boolean> {
    const { bookingInfo } = await getBookingInfo(rescheduleUid);
    if (!bookingInfo) {
      return false;
    }
    if (bookingInfo.status !== "ACCEPTED" && bookingInfo.status !== "PENDING") {
      return false;
    }
    if (bookingInfo.eventTypeId !== eventTypeId) {
      return false;
    }
    return true;
  }

  private async checkBookingRequiresAuthentication(
    req: Request,
    eventTypeId: number,
    rescheduleUid?: string
  ): Promise<void> {
    const eventType = await this.eventTypeRepository.findByIdIncludeHostsAndTeamMembers({
      id: eventTypeId,
    });

    if (!eventType?.bookingRequiresAuthentication) {
      return;
    }

    if (rescheduleUid) {
      const isValidRescheduleBooking = await this.isValidRescheduleBooking(rescheduleUid, eventTypeId);
      if (isValidRescheduleBooking) {
        return;
      } else {
        throw new BadRequestException(
          "Trying to reschedule an event-type which requires authentication but provided invalid rescheduleUid."
        );
      }
    }

    const owner = await this.getOwner(req);
    const userId = owner?.id;

    if (!userId) {
      throw new UnauthorizedException(
        "This event type requires authentication. Please provide valid credentials."
      );
    }

    const isEventTypeOwner = eventType.userId === userId;
    const isHost = eventType.hosts.some((host) => host.userId === userId);
    const isTeamAdminOrOwner = eventType.team?.members.some((member) => member.userId === userId) ?? false;

    let isOrgAdminOrOwner = false;
    if (eventType.team?.parentId) {
      const orgTeam = await this.teamRepository.getTeamByIdIfUserIsAdmin({
        userId,
        teamId: eventType.team.parentId,
      });
      isOrgAdminOrOwner = !!orgTeam;
    } else if (eventType.team?.isOrganization) {
      isOrgAdminOrOwner = isTeamAdminOrOwner;
    }

    const isAuthorized = isEventTypeOwner || isHost || isTeamAdminOrOwner || isOrgAdminOrOwner;

    if (!isAuthorized) {
      throw new ForbiddenException(
        "You are not authorized to book this event type. You must be the event type owner, a host, a team admin/owner, or an organization admin/owner."
      );
    }
  }

  private async getOAuthClientsParams(clientId: string, isEmbed = false): Promise<OAuthRequestParams> {
    const res = { ...DEFAULT_PLATFORM_PARAMS };

    if (isEmbed) {
      // embed should ignore oauth client settings and enable emails by default
      return { ...res, arePlatformEmailsEnabled: true, areCalendarEventsEnabled: true };
    }

    try {
      const client = await this.oAuthClientRepository.getOAuthClient(clientId);
      // fetch oAuthClient from db and use data stored in db to set these values
      if (client) {
        res.platformClientId = clientId;
        res.platformCancelUrl = client.bookingCancelRedirectUri ?? "";
        res.platformRescheduleUrl = client.bookingRescheduleRedirectUri ?? "";
        res.platformBookingUrl = client.bookingRedirectUri ?? "";
        res.arePlatformEmailsEnabled = client.areEmailsEnabled ?? false;
        res.areCalendarEventsEnabled = client.areCalendarEventsEnabled;
      }
      return res;
    } catch (err) {
      this.logger.error(err);
      return res;
    }
  }

  private async createNextApiBookingRequest(
    req: BookingRequest,
    oAuthClientId?: string,
    platformBookingLocation?: string,
    isEmbed?: string
  ): Promise<NextApiRequest & { userId?: number; userUuid?: string } & OAuthRequestParams> {
    const requestId = req.get("X-Request-Id");
    const clone = { ...req };
    const owner = clone.body.rescheduleUid
      ? await this.getOwnerRescheduledBooking(req, oAuthClientId)
      : await this.getOwner(req);

    const userId = owner?.id;
    const userUuid = owner?.uuid;

    const oAuthParams = oAuthClientId
      ? await this.getOAuthClientsParams(oAuthClientId, this.transformToBoolean(isEmbed))
      : DEFAULT_PLATFORM_PARAMS;
    this.logger.log(`createNextApiBookingRequest_2024_04_15`, {
      requestId,
      ownerId: userId,
      platformBookingLocation,
      oAuthClientId,
      ...oAuthParams,
    });
    Object.assign(clone, { userId, userUuid, ...oAuthParams, platformBookingLocation });
    clone.body = {
      ...clone.body,
      noEmail: !oAuthParams.arePlatformEmailsEnabled,
      creationSource: CreationSource.API_V2,
    };
    if (oAuthClientId) {
      await this.setPlatformAttendeesEmails(clone.body, oAuthClientId);
    }
    return clone as unknown as NextApiRequest & { userId?: number; userUuid?: string } & OAuthRequestParams;
  }

  async setPlatformAttendeesEmails(
    requestBody: { responses?: { email?: string; guests?: string[] } },
    oAuthClientId: string
  ): Promise<void> {
    if (requestBody?.responses?.email) {
      requestBody.responses.email = await this.platformBookingsService.getPlatformAttendeeEmail(
        requestBody.responses.email,
        oAuthClientId
      );
    }
    if (requestBody?.responses?.guests && requestBody?.responses?.guests.length) {
      requestBody.responses.guests = await this.platformBookingsService.getPlatformAttendeesEmails(
        requestBody.responses.guests,
        oAuthClientId
      );
    }
  }

  private async createNextApiRecurringBookingRequest(
    req: BookingRequest,
    oAuthClientId?: string,
    platformBookingLocation?: string,
    isEmbed?: string
  ): Promise<NextApiRequest & { userId?: number; userUuid?: string } & OAuthRequestParams> {
    const clone = { ...req };
    const owner = await this.getOwner(req);
    const userId = owner?.id ?? -1;
    const userUuid = owner?.uuid;

    const oAuthParams = oAuthClientId
      ? await this.getOAuthClientsParams(oAuthClientId, this.transformToBoolean(isEmbed))
      : DEFAULT_PLATFORM_PARAMS;
    const requestId = req.get("X-Request-Id");
    this.logger.log(`createNextApiRecurringBookingRequest_2024_04_15`, {
      requestId,
      ownerId: userId,
      platformBookingLocation,
      oAuthClientId,
      ...oAuthParams,
    });
    Object.assign(clone, {
      userId,
      userUuid,
      ...oAuthParams,
      platformBookingLocation,
      noEmail: !oAuthParams.arePlatformEmailsEnabled,
      creationSource: CreationSource.API_V2,
    });
    if (oAuthClientId) {
      await this.setPlatformAttendeesEmails(clone.body, oAuthClientId);
    }
    return clone as unknown as NextApiRequest & { userId?: number; userUuid?: string } & OAuthRequestParams;
  }

  private handleBookingErrors(
    err: Error | HttpError | unknown,
    type?: "recurring" | `instant` | "no-show"
  ): void {
    const errMsg =
      type === "no-show"
        ? `Error while marking no-show.`
        : `Error while creating ${type ? type + " " : ""}booking.`;
    if (err instanceof HttpError) {
      const httpError = err as HttpError;
      throw new HttpException(httpError?.message ?? errMsg, httpError?.statusCode ?? 500);
    }

    if (err instanceof Error) {
      const error = err as Error;
      if (err instanceof HttpException) {
        throw new HttpException(err.getResponse(), err.getStatus());
      }
      if (Object.values(ErrorCode).includes(error.message as unknown as ErrorCode)) {
        throw new HttpException(error.message, 400);
      }
      throw new InternalServerErrorException(error?.message ?? errMsg);
    }

    throw new InternalServerErrorException(errMsg);
  }

  private transformToBoolean(v?: string): boolean {
    return v && typeof v === "string" ? v.toLowerCase() === "true" : false;
  }
}
