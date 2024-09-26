import {
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { randomBytes } from "crypto";
import { Request } from "express";
import { NextApiRequest } from "next/types";

import dayjs from "@calcom/dayjs";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { BOOKING_READ, BOOKING_WRITE, SUCCESS_STATUS, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import {
  BookingResponse,
  HttpError,
  getAllUserBookings,
  getBookingForReschedule,
  handleCancelBooking,
  handleInstantMeeting,
  handleMarkNoShow,
  handleNewBooking,
  handleNewRecurringBooking,
  slugify,
} from "@calcom/platform-libraries";
import { ApiResponse, CancelBookingInput, GetBookingsInput, Status } from "@calcom/platform-types";
import { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import { supabase } from "../../../config/supabase";
import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { GetUser } from "../../../modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "../../../modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "../../../modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions/permissions.guard";
import { BillingService } from "../../../modules/billing/services/billing.service";
import { OAuthClientRepository } from "../../../modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "../../../modules/oauth-clients/services/oauth-flow.service";
import { CreateBookingInput } from "../inputs/create-booking.input";
import { CreateRecurringBookingInput } from "../inputs/create-recurring-booking.input";
import { MarkNoShowInput } from "../inputs/mark-no-show.input";
import { GetBookingOutput } from "../outputs/get-booking.output";
import { GetBookingsOutput } from "../outputs/get-bookings.output";
import { MarkNoShowOutput } from "../outputs/mark-no-show.output";

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
};

const DEFAULT_PLATFORM_PARAMS = {
  platformClientId: "",
  platformCancelUrl: "",
  platformRescheduleUrl: "",
  platformBookingUrl: "",
  arePlatformEmailsEnabled: false,
  platformBookingLocation: undefined,
};

@Controller({
  path: "/v2/bookings",
  version: API_VERSIONS_VALUES,
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
export class BookingsController {
  private readonly logger = new Logger("BookingsController");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly billingService: BillingService
  ) {}

  @Get("/")
  // @UseGuards(ApiAuthGuard)
  // @Permissions([BOOKING_READ])
  @ApiQuery({ name: "filters[status]", enum: Status, required: true })
  @ApiQuery({ name: "limit", type: "number", required: false })
  @ApiQuery({ name: "cursor", type: "number", required: false })
  async getBookings(@Query() queryParams: GetBookingsInput): Promise<GetBookingsOutput> {
    const { filters, cursor, limit } = queryParams;
    const bookings = await this.getAllUserBookings({ filters, cursor, limit });
    const nextCursor = (cursor ?? 0) + (limit ?? 10);

    return {
      status: SUCCESS_STATUS,
      data: { bookings, nextCursor, recurringInfo: [] },
    };
  }

  @Get("/:bookingUid")
  async getBooking(@Param("bookingUid") bookingUid: string): Promise<GetBookingOutput> {
    const bookingInfo = await this.getBookingInfo(bookingUid);

    if (!bookingInfo) {
      throw new NotFoundException(`Booking with UID=${bookingUid} does not exist.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: bookingInfo,
    };
  }

  @Get("/:bookingUid/reschedule")
  async getBookingForReschedule(@Param("bookingUid") bookingUid: string): Promise<ApiResponse<unknown>> {
    const booking = await this.getBookingReschedule(bookingUid);

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
    @Body() body: CreateBookingInput,
    @Headers(X_CAL_CLIENT_ID) clientId?: string
  ): Promise<ApiResponse<Partial<BookingResponse>>> {
    const oAuthClientId = clientId?.toString();
    const { orgSlug, locationUrl } = body;
    req.headers["x-cal-force-slug"] = orgSlug;
    const {
      bookingUid,
      end,
      start,
      eventTypeSlug,
      user,
      responses,
      hashedLink,
      language,
      metadata,
      timeZone,
      ...otherParams
    } = body;
    try {
      const { data: eventType } = await supabase
        .from("EventType")
        .select("title")
        .eq("id", req.body.eventTypeId)
        .single();

      if (!eventType) throw new NotFoundException("Event type not found.");

      const { data: booking, error } = await supabase
        .from("Booking")
        .insert({
          ...otherParams,
          uid: bookingUid,
          endTime: end,
          userId: 44,
          title: eventType.title,
          startTime: start,
          user: JSON.stringify(user),
          responses: JSON.stringify(responses),
          metadata: JSON.stringify(metadata),
        })
        .select("*")
        .single();

      return {
        status: SUCCESS_STATUS,
        data: booking || error,
      };
    } catch (err) {
      this.handleBookingErrors(err);
    }
    throw new InternalServerErrorException("Could not create booking.");
  }

  @Post("/:bookingId/cancel")
  async cancelBooking(
    @Req() req: BookingRequest,
    @Param("bookingId") bookingId: string,
    @Body() _: CancelBookingInput,
    @Headers(X_CAL_CLIENT_ID) clientId?: string
  ): Promise<ApiResponse<{ bookingId: number; bookingUid: string; onlyRemovedAttendee: boolean }>> {
    // const oAuthClientId = clientId?.toString();
    if (!bookingId) throw new NotFoundException("Booking ID is required.");

    try {
      const data = await this.cancelUsageByBookingUid(req, bookingId);
      return {
        status: SUCCESS_STATUS,
        data,
      };
    } catch (err) {
      this.handleBookingErrors(err);
    }

    throw new InternalServerErrorException("Could not cancel booking.");
  }

  @Post("/:bookingUid/mark-no-show")
  @Permissions([BOOKING_WRITE])
  @UseGuards(ApiAuthGuard)
  async markNoShow(
    @GetUser("id") userId: number,
    @Body() body: MarkNoShowInput,
    @Param("bookingUid") bookingUid: string
  ): Promise<MarkNoShowOutput> {
    try {
      const markNoShowResponse = await handleMarkNoShow({
        bookingUid: bookingUid,
        attendees: body.attendees,
        noShowHost: body.noShowHost,
        userId,
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
    @Body() _: CreateRecurringBookingInput[],
    @Headers(X_CAL_CLIENT_ID) clientId?: string
  ): Promise<ApiResponse<BookingResponse[]>> {
    const oAuthClientId = clientId?.toString();
    try {
      const createdBookings: BookingResponse[] = await handleNewRecurringBooking(
        await this.createNextApiBookingRequest(req, oAuthClientId)
      );

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
    @Body() _: CreateBookingInput,
    @Headers(X_CAL_CLIENT_ID) clientId?: string
  ): Promise<ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>>> {
    const oAuthClientId = clientId?.toString();
    req.userId = (await this.getOwnerId(req)) ?? -1;
    const reqBody = req.body as any;
    const { bookingUid: uid, name, email, timeZone, language } = reqBody;

    const token = randomBytes(32).toString("hex");

    const invitee = [
      {
        email,
        name,
        timeZone: timeZone,
        locale: language ?? "en",
      },
    ];

    const guests = (reqBody.guests || []).reduce((guestArray: any, guest: any) => {
      guestArray.push({
        email: guest,
        name: "",
        timeZone,
        locale: "en",
      });
      return guestArray;
    }, [] as any[]);

    const attendeesList = [...invitee, ...guests];

    const customInputsResponses = {} as any;

    const { data: eventType } = await supabase
      .from("EventType")
      .select("*")
      .eq("id", reqBody.eventTypeId)
      .single();

    if (reqBody.customInputs && (reqBody.customInputs.length || 0) > 0) {
      reqBody.customInputs.forEach(({ label, value }: any) => {
        customInputsResponses[label] = value;
      });
    } else {
      const responses = reqBody.responses || {};
      for (const [fieldName, fieldValue] of Object.entries(responses)) {
        const foundACustomInputForTheResponse = (eventType.customInputs as any).find(
          (input: { label: any }) => slugify(input.label) === fieldName
        );
        if (foundACustomInputForTheResponse) {
          customInputsResponses[foundACustomInputForTheResponse.label] = fieldValue;
        }
      }
    }

    try {
      const newBookingData: any = {
        uid,
        responses: reqBody.responses === null ? Prisma.JsonNull : reqBody.responses,
        title: `Reunião instantânea com ${invitee[0].name}`,
        startTime: dayjs.utc(reqBody.start).toDate(),
        endTime: dayjs.utc(reqBody.end).toDate(),
        description: reqBody.notes,
        customInputs: JSON.stringify(customInputsResponses),
        status: BookingStatus.AWAITING_HOST,
        location: "integrations:daily",
        eventTypeId: reqBody.eventTypeId,
        metadata: { ...reqBody.metadata, videoCallUrl: `${WEBAPP_URL}/video/${uid}` },
      };

      const { data: newBooking } = await supabase.from("Booking").insert(newBookingData).select("*").single();

      for (const attendee of attendeesList) {
        await supabase.from("Attendee").insert(attendee);
      }

      await supabase.from("Booking").insert(newBookingData).select("*").single();

      const { data: eventType } = (await supabase
        .from("EventType")
        .select("*")
        .eq("id", req.body.eventTypeId)
        .single()) ?? { data: 90 };

      if (eventType === null || eventType.teamId === null)
        throw new HttpError(400, "Event type is not associated with a team.");

      const instantMeetingExpiryTimeOffsetInSeconds = eventType.instantMeetingExpiryTimeOffsetInSeconds ?? 90;

      const { data: instantMeetingToken } = await supabase
        .from("InstantMeetingToken")
        .insert({
          token,
          expires: new Date(
            (new Date().getTime() + 1000 * instantMeetingExpiryTimeOffsetInSeconds) as number
          ),
          teamId: eventType.teamId,
          bookingId: newBooking.id,
          updatedAt: new Date().toISOString(),
        })
        .select("*")
        .single();

      const instantMeeting = {
        message: "Success",
        meetingTokenId: instantMeetingToken.id,
        bookingId: newBooking.id,
        bookingUid: newBooking.uid,
        expires: instantMeetingToken.expires,
        userId: newBooking.userId,
      };
      return {
        status: SUCCESS_STATUS,
        data: instantMeeting,
      };
    } catch (err) {
      this.handleBookingErrors(err, "instant");
    }
    throw new InternalServerErrorException("Could not create instant booking.");
  }

  private async getAllUserBookings({
    cursor,
    filters,
    limit,
  }: GetBookingsInput): Promise<GetBookingsOutput["data"]["bookings"]> {
    const range = (cursor ?? 0) + (limit ?? 10) - 1;
    const { data: bookings, error } = await supabase
      .from("Booking")
      .select("*")
      .eq("status", filters.status)
      .range(cursor ?? 0, range)
      .limit(limit ?? 10);

    if (error || !bookings) return null;

    return bookings as GetBookingsOutput["data"]["bookings"];
  }

  private async getBookingInfo(bookingUid: string): Promise<GetBookingOutput["data"] | null> {
    const { data: bookingInfo, error } = await supabase
      .from("Booking")
      .select("*")
      .eq("uid", bookingUid)
      .limit(1)
      .single();

    if (error || !bookingInfo) return null;

    return bookingInfo;
  }

  private async getBookingReschedule(uid: string, userId?: number): Promise<any> {
    let rescheduleUid: string | null = null;

    const theBooking = this.getBookingInfo(uid) as any;

    let bookingSeatReferenceUid: number | null = null;
    let attendeeEmail: string | null = null;
    let hasOwnershipOnBooking = false;
    let bookingSeatData: { description?: string; responses: Prisma.JsonValue } | null = null;

    if (!theBooking) {
      const { data: bookingSeat, error } = await supabase
        .from("BookingSeat")
        .select("*")
        .eq("referenceUid", uid)
        .limit(1)
        .single();

      if (bookingSeat && !error) {
        bookingSeatData = bookingSeat.data as any;
        bookingSeatReferenceUid = bookingSeat.id;
        rescheduleUid = bookingSeat.booking.uid;
        attendeeEmail = bookingSeat.attendee.email;
      }
    }

    if (theBooking && theBooking?.eventType?.seatsPerTimeSlot && bookingSeatReferenceUid === null) {
      const isOwnerOfBooking = theBooking.userId === userId;

      const isHostOfEventType = theBooking?.eventType?.hosts.some(
        (host: { userId?: number }) => host.userId === userId
      );

      const isUserIdInBooking = theBooking.userId === userId;

      if (!isOwnerOfBooking && !isHostOfEventType && !isUserIdInBooking) return null;
      hasOwnershipOnBooking = true;
    }

    if (!theBooking && !rescheduleUid) return null;

    const booking = await this.getBookingInfo(rescheduleUid || uid);

    if (!booking) return null;

    if (bookingSeatReferenceUid) booking["description"] = bookingSeatData?.description ?? null;

    return {
      ...booking,
      attendees: rescheduleUid
        ? booking.attendees.filter((attendee: any) => attendee.email === attendeeEmail)
        : hasOwnershipOnBooking
        ? []
        : booking.attendees,
    };
  }

  private async cancelUsageByBookingUid(req: BookingRequest, bookingId: string): Promise<any> {
    const { cancellationReason } = req.body;
    const { data: bookingToDelete, error } = await supabase
      .from("Booking")
      .update({
        status: BookingStatus.CANCELLED.toLowerCase(),
        cancellationReason,
      })
      .eq("uid", bookingId)
      .select("*")
      .single();

    if (bookingToDelete?.eventType?.seatsPerTimeSlot)
      await supabase.from("Attendee").delete().eq("bookingId", bookingId).select("*");

    await supabase
      .from("Booking")
      .update({
        status: BookingStatus.CANCELLED.toLowerCase(),
        cancellationReason,
        iCalSequence: bookingToDelete.iCalSequence ? bookingToDelete.iCalSequence : 100,
      })
      .eq("uid", bookingToDelete!.recurringEventId as string)
      .select("*");

    return {
      onlyRemovedAttendee: false,
      bookingId: bookingToDelete.id,
      bookingUid: bookingToDelete.uid,
    };
  }

  private async getOwnerId(req: Request): Promise<number | undefined> {
    try {
      const accessToken = req.get("Authorization")?.replace("Bearer ", "");
      if (accessToken) {
        return this.oAuthFlowService.getOwnerId(accessToken);
      }
    } catch (err) {
      this.logger.error(err);
    }
  }

  private async getOAuthClientsParams(clientId: string): Promise<OAuthRequestParams> {
    const res = DEFAULT_PLATFORM_PARAMS;
    try {
      const client = await this.oAuthClientRepository.getOAuthClient(clientId);
      // fetch oAuthClient from db and use data stored in db to set these values
      if (client) {
        res.platformClientId = clientId;
        res.platformCancelUrl = client.bookingCancelRedirectUri ?? "";
        res.platformRescheduleUrl = client.bookingRescheduleRedirectUri ?? "";
        res.platformBookingUrl = client.bookingRedirectUri ?? "";
        res.arePlatformEmailsEnabled = client.areEmailsEnabled ?? false;
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
    platformBookingLocation?: string
  ): Promise<NextApiRequest & { userId?: number } & OAuthRequestParams> {
    const userId = (await this.getOwnerId(req)) ?? -1;
    const oAuthParams = oAuthClientId
      ? await this.getOAuthClientsParams(oAuthClientId)
      : DEFAULT_PLATFORM_PARAMS;
    Object.assign(req, { userId, ...oAuthParams, platformBookingLocation });
    req.body = { ...req.body, noEmail: !oAuthParams.arePlatformEmailsEnabled };
    return req as unknown as NextApiRequest & { userId?: number } & OAuthRequestParams;
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
      throw new InternalServerErrorException(error?.message ?? errMsg);
    }

    throw new InternalServerErrorException(errMsg);
  }
}
