import { CreateBookingInput } from "@/ee/bookings/inputs/create-booking.input";
import { CreateReccuringBookingInput } from "@/ee/bookings/inputs/create-reccuring-booking.input";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import {
  Controller,
  Post,
  Logger,
  UseGuards,
  Req,
  InternalServerErrorException,
  Body,
  HttpException,
} from "@nestjs/common";
import { User } from "@prisma/client";
import { Request } from "express";
import { NextApiRequest } from "next/types";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  handleNewBooking,
  BookingResponse,
  HttpError,
  handleNewRecurringBooking,
  handleInstantMeeting,
} from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

const handleBookingErrors = (err: Error | HttpError | unknown, type?: "recurring" | `instant`): void => {
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
};

@Controller({
  path: "ee/bookings",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class BookingsController {
  private readonly logger = new Logger("ee bookings controller");

  @Post("/create")
  async createBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput,
    @GetUser() user: User
  ): Promise<ApiResponse<BookingResponse>> {
    req.userId = user.id;
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

  @Post("/reccuring/create")
  async createReccuringBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateReccuringBookingInput[],
    @GetUser() user: User
  ): Promise<ApiResponse<BookingResponse[]>> {
    req.userId = user.id;
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

  @Post("/instant/create")
  async createInstantBooking(
    @Req() req: Request & { userId?: number },
    @Body() _: CreateBookingInput,
    @GetUser() user: User
  ): Promise<ApiResponse<Awaited<ReturnType<typeof handleInstantMeeting>>>> {
    req.userId = user.id;
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
}
