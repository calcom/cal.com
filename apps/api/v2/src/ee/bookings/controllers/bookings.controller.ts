import { CreateBookingInput } from "@/ee/bookings/inputs/create-booking.input";
import { CreateReccuringBookingInput } from "@/ee/bookings/inputs/create-reccuring-booking.input";
import { GetBookingOutput } from "@/ee/bookings/outputs/get-booking.output";
import { GetBookingsOutput } from "@/ee/bookings/outputs/get-bookings.output";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import {
  Controller,
  Post,
  Logger,
  Req,
  InternalServerErrorException,
  Body,
  HttpException,
  Param,
  Get,
  Query,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { ApiQuery, ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";
import { Request } from "express";
import { NextApiRequest } from "next/types";

import { BOOKING_READ, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  getAllUserBookings,
  getBookingInfo,
  handleCancelBooking,
  getBookingForReschedule,
} from "@calcom/platform-libraries";
import {
  handleNewBooking,
  BookingResponse,
  HttpError,
  handleNewRecurringBooking,
  handleInstantMeeting,
} from "@calcom/platform-libraries";
import { GetBookingsInput, CancelBookingInput, Status } from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Controller({
  path: "ee/bookings",
  version: "2",
})
@UseGuards(PermissionsGuard)
@DocsTags("Bookings")
export class BookingsController {
  private readonly logger = new Logger("ee bookings controller");

  constructor(
    private readonly oAuthFlowService: OAuthFlowService,
    private readonly prismaReadService: PrismaReadService
  ) {}

  @Get("/")
  @UseGuards(AccessTokenGuard)
  @Permissions([BOOKING_READ])
  @ApiQuery({ name: "filters[status]", enum: Status, required: true })
  @ApiQuery({ name: "limit", type: "number", required: false })
  @ApiQuery({ name: "cursor", type: "number", required: false })
  async getBookings(
    @GetUser() user: User,
    @Query() queryParams: GetBookingsInput
  ): Promise<GetBookingsOutput> {
    const { filters, cursor, limit } = queryParams;
    const bookings = await getAllUserBookings({
      bookingListingByStatus: filters.status,
      skip: cursor ?? 0,
      take: limit ?? 10,
      filters,
      ctx: {
        user: { email: user.email, id: user.id },
        prisma: this.prismaReadService.prisma as unknown as PrismaClient,
      },
    });

    return {
      status: SUCCESS_STATUS,
      data: bookings,
    };
  }

  @Get("/:bookingUid")
  async getBooking(@Param("bookingUid") bookingUid: string): Promise<GetBookingOutput> {
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
  async getBookingForReschedule(@Param("bookingUid") bookingUid: string): Promise<ApiResponse<unknown>> {
    const booking = await getBookingForReschedule(bookingUid);

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
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput
  ): Promise<ApiResponse<unknown>> {
    req.userId = (await this.getOwnerId(req)) ?? -1;
    req.body = { ...req.body, noEmail: true };
    try {
      const booking = await handleNewBooking(req as unknown as NextApiRequest & { userId?: number });
      return {
        status: SUCCESS_STATUS,
        data: booking,
      };
    } catch (err) {
      handleBookingErrors(err);
    }
    throw new InternalServerErrorException("Could not create booking.");
  }

  @Post("/:bookingId/cancel")
  async cancelBooking(
    @Req() req: Request & { userId?: number },
    @Param("bookingId") bookingId: string,
    @Body() body: CancelBookingInput
  ): Promise<ApiResponse> {
    if (bookingId) {
      req.userId = (await this.getOwnerId(req)) ?? -1;
      req.body = { ...body, id: parseInt(bookingId) };
      try {
        await handleCancelBooking(req as unknown as NextApiRequest & { userId?: number });
        return {
          status: SUCCESS_STATUS,
        };
      } catch (err) {
        handleBookingErrors(err);
      }
    } else {
      throw new NotFoundException("Booking ID is required.");
    }
    throw new InternalServerErrorException("Could not cancel booking.");
  }

  @Post("/reccuring")
  async createReccuringBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateReccuringBookingInput[]
  ): Promise<ApiResponse<BookingResponse[]>> {
    req.userId = (await this.getOwnerId(req)) ?? -1;
    req.body = { ...req.body, noEmail: true };
    try {
      const createdBookings: BookingResponse[] = await handleNewRecurringBooking(
        req as unknown as NextApiRequest & { userId?: number }
      );
      return {
        status: SUCCESS_STATUS,
        data: createdBookings,
      };
    } catch (err) {
      handleBookingErrors(err, "recurring");
    }
    throw new InternalServerErrorException("Could not create recurring booking.");
  }

  @Post("/instant")
  async createInstantBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput
  ): Promise<ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>>> {
    req.userId = (await this.getOwnerId(req)) ?? -1;
    req.body = { ...req.body, noEmail: true };
    try {
      const instantMeeting = await handleInstantMeeting(
        req as unknown as NextApiRequest & { userId?: number }
      );
      return {
        status: SUCCESS_STATUS,
        data: instantMeeting,
      };
    } catch (err) {
      handleBookingErrors(err, "instant");
    }
    throw new InternalServerErrorException("Could not create instant booking.");
  }

  async getOwnerId(req: Request): Promise<number | undefined> {
    try {
      const accessToken = req.get("Authorization")?.replace("Bearer ", "");
      if (accessToken) {
        return this.oAuthFlowService.getOwnerId(accessToken);
      }
    } catch (err) {
      this.logger.error(err);
    }
  }
}

function handleBookingErrors(err: Error | HttpError | unknown, type?: "recurring" | `instant`): void {
  const errMsg = `Error while creating ${type ? type + " " : ""}booking.`;
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
